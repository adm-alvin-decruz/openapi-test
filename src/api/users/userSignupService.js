const crypto = require("crypto");
const cognitoService = require("../../services/cognitoService");
const { getOrCheck } = require("../../utils/cognitoAttributes");
const {
  getSource,
  getGroup,
  formatPhoneNumber,
  maskKeyRandomly,
} = require("../../utils/common");
const SignUpErrors = require("../../config/https/errors/signupErrors");
const passwordService = require("./userPasswordService");
const userModel = require("../../db/models/userModel");
const {
  getCurrentUTCTimestamp,
  convertDateToMySQLFormat,
} = require("../../utils/dateUtils");
const pool = require("../../db/connections/mysqlConn");
const CommonErrors = require("../../config/https/errors/common");
const commonService = require("../../services/commonService");
const failedJobsModel = require("../../db/models/failedJobsModel");
const userMigrationsModel = require("../../db/models/userMigrationsModel");
const loggerService = require("../../logs/logger");
const empMembershipUserAccountsModel = require("../../db/models/empMembershipUserAccountsModel");
const { GROUP } = require("../../utils/constants");
const { SendMessageCommand, SQSClient } = require("@aws-sdk/client-sqs");

const awsRegion = () => {
  const env = process.env.AWS_REGION_NAME;
  if (!env) return "ap-southeast-1";
  if (env === "false") return "ap-southeast-1";
  return env;
};
const sqsClient = new SQSClient({ region: awsRegion });

class UserSignupService {
  async isUserExistedInCognito(email) {
    try {
      return await cognitoService.cognitoAdminGetUserByEmail(email);
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      const errorData =
        errorMessage.data && errorMessage.data.name ? errorMessage.data : "";
      if (errorData.name && errorData.name === "UserNotFoundException") {
        return false;
      }
      if (errorMessage.status === "failed") {
        throw new Error(JSON.stringify(CommonErrors.NotImplemented()));
      }
    }
  }

  generateMandaiId(req) {
    //set source
    const source = getSource(req.headers["mwg-app-id"]);
    const groupKey = getGroup(req.body.group);

    const hash = crypto
      .createHash("sha256")
      .update(
        `${req.body.email}${req.body.dob}${req.body.firstName}${req.body.lastName}`
      )
      .digest("hex");
    const numbers = hash.replace(/\D/g, "");
    return `M${groupKey}${source.sourceKey}${numbers.slice(0, 11)}`;
  }

  userModelExecution(userData) {
    const sql = `
      INSERT INTO users
      (email, given_name, family_name, birthdate, mandai_id, source, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      userData.email,
      userData.given_name,
      userData.family_name,
      convertDateToMySQLFormat(userData.birthdate),
      userData.mandai_id,
      userData.source,
      userData.active,
      userData.created_at,
      getCurrentUTCTimestamp(),
    ];
    return commonService.replaceSqlPlaceholders(sql, params);
  }

  userCredentialModelExecution(credentialData) {
    const sql = `
      INSERT INTO user_credentials
      (user_id, username, password_hash, salt, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      credentialData.user_id,
      credentialData.username,
      credentialData.password_hash,
      credentialData.salt,
      getCurrentUTCTimestamp(),
      getCurrentUTCTimestamp(),
    ];
    return commonService.replaceSqlPlaceholders(sql, params);
  }

  userNewsletterModelExecution(newsletterData) {
    const sql = `
      INSERT INTO user_newsletters
      (user_id, name, type, subscribe, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      newsletterData.user_id,
      newsletterData.name,
      newsletterData.type,
      newsletterData.subscribe,
      getCurrentUTCTimestamp(),
      getCurrentUTCTimestamp(),
    ];
    return commonService.replaceSqlPlaceholders(sql, params);
  }

  userDetailModelExecution(detailData) {
    const sql = `
      INSERT INTO user_details
      (user_id, phone_number, zoneinfo, address, picture, vehicle_iu, vehicle_plate, extra, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      detailData.user_id,
      detailData.phone_number,
      detailData.zoneinfo,
      detailData.address,
      detailData.picture,
      detailData.vehicle_iu,
      detailData.vehicle_plate,
      JSON.stringify(detailData.extra),
      getCurrentUTCTimestamp(),
      getCurrentUTCTimestamp(),
    ];
    return commonService.replaceSqlPlaceholders(sql, params);
  }

  importUserInformation(userDB, req, hashPassword, salt, phoneNumber) {
    return [
      req.body.newsletter && req.body.newsletter.name
        ? this.userNewsletterModelExecution({
            user_id: userDB.user_id,
            name: req.body.newsletter.name ? req.body.newsletter.name : "",
            type: req.body.newsletter.type ? req.body.newsletter.type : "",
            subscribe: req.body.newsletter && !!req.body.newsletter.subscribe,
          })
        : undefined,
      this.userCredentialModelExecution({
        user_id: userDB.user_id,
        username: req.body.email,
        password_hash: hashPassword,
        salt: salt,
      }),
      this.userDetailModelExecution({
        user_id: userDB.user_id,
        phone_number: !!phoneNumber ? phoneNumber : null,
        zoneinfo: req.body.country ? req.body.country : null,
        address: req.body.address ? req.body.address : null,
        picture: req.body.picture ? req.body.picture : null,
        vehicle_iu: req.body.vehicleIU ? req.body.vehicleIU : null,
        vehicle_plate: req.body.vehiclePlate ? req.body.vehiclePlate : null,
        extra: req.body.extra ? req.body.extra : null,
      }),
    ].filter((work) => !!work);
  }

  async saveUserDB({ req, phoneNumber, mandaiId, hashPassword, saltPassword }) {
    loggerService.log(
      {
        user: {
          action: "saveUserDB",
          phoneNumber,
          mandaiId,
          hashPassword: maskKeyRandomly(hashPassword),
          saltPassword: maskKeyRandomly(saltPassword),
          body: req.body,
          layer: "userSignupService.saveUserDB",
        },
      },
      "[CIAM] Start saveUserDB at Signup Service"
    );
    const source = getSource(req.headers["mwg-app-id"]);

    let userDB = null;
    try {
      userDB = await userModel.create({
        email: req.body.email,
        given_name: req.body.firstName ? req.body.firstName.trim() : "",
        family_name: req.body.lastName ? req.body.lastName.trim() : "",
        birthdate: req.body.dob || null,
        mandai_id: mandaiId,
        source: source.sourceDB,
        active: true,
        created_at: getCurrentUTCTimestamp(),
      });
    } catch (error) {
      await failedJobsModel.create({
        uuid: crypto.randomUUID(),
        name: "failedCreateNewUser",
        action: "failed",
        data: this.userModelExecution({
          email: req.body.email,
          given_name: req.body.firstName ? req.body.firstName.trim() : "",
          family_name: req.body.lastName ? req.body.lastName.trim() : "",
          birthdate: req.body.dob || null,
          mandai_id: mandaiId,
          source: source.sourceDB,
          active: true,
          created_at: getCurrentUTCTimestamp(),
        }),
        source: 2,
        triggered_at: null,
        status: 0,
      });
    }

    if (userDB && userDB.user_id) {
      !!req.body.migrations &&
        (await userMigrationsModel.updateMembershipUserAccounts(
          req.body.email,
          req.body.batchNo,
          userDB.user_id
        ));
      try {
        await pool.transaction(
          this.importUserInformation(
            userDB,
            req,
            hashPassword,
            saltPassword,
            phoneNumber
          )
        );
        loggerService.log(
          {
            user: {
              action: "saveUserDB",
              phoneNumber,
              mandaiId,
              layer: "userSignupService.saveUserDB",
            },
          },
          "[CIAM] End saveUserDB at Signup Service - Success"
        );
      } catch (error) {
        loggerService.error(
          {
            user: {
              action: "saveUserDB",
              phoneNumber,
              mandaiId,
              hashPassword: maskKeyRandomly(hashPassword),
              saltPassword: maskKeyRandomly(saltPassword),
              body: req.body,
              layer: "userSignupService.saveUserDB",
              error: `${error}`,
            },
          },
          "[CIAM] End saveUserDB at Signup Service - Failed"
        );
        await failedJobsModel.create({
          uuid: crypto.randomUUID(),
          name: "failedCreateNewUserInformation",
          action: "failed",
          data: this.importUserInformation(
            userDB,
            req,
            hashPassword,
            saltPassword
          ).join("|"),
          source: 2,
          triggered_at: null,
          status: 0,
        });
      }
    }
  }

  generateNewsletter(req) {
    if (!!req.body.migrations && req.body.newsletter === 1) {
      return {
        name: "membership",
        type: "1",
        subscribe: req.body.newsletter && !!req.body.newsletter.subscribe,
      };
    }
    return req.body && req.body.newsletter && req.body.newsletter.name
      ? {
          name: "membership",
          type: "1",
          subscribe: req.body.newsletter && !!req.body.newsletter.subscribe,
        }
      : null;
  }

  generatePhoneNumber(req) {
    if (
      req.body.phoneNumber === "0" ||
      req.body.phoneNumber === "null" ||
      req.body.phoneNumber === "undefined"
    ) {
      return "";
    }
    if (!!req.body.migrations && !!req.body.phoneNumber) {
      return formatPhoneNumber(req.body.phoneNumber).startsWith("+")
        ? formatPhoneNumber(req.body.phoneNumber)
        : `+65${formatPhoneNumber(req.body.phoneNumber)}`;
    }
    return !!req.body.phoneNumber
      ? formatPhoneNumber(req.body.phoneNumber)
      : "";
  }

  async preparePassword(req) {
    if (!!req.body.migrations) {
      const saltPassword = !!req.body.passwordSalt
        ? req.body.passwordSalt
        : passwordService.createSaltKey(5);
      const passwordTemporary = crypto.randomUUID();
      const hashPassword = !!req.body.passwordHash
        ? req.body.passwordHash
        : passwordService.createPassword(passwordTemporary, saltPassword);

      return {
        db: {
          hashPassword: hashPassword,
          salt: saltPassword,
        },
        cognito: {
          hashPassword:
            !!req.body.passwordSalt && !!req.body.passwordHash
              ? `${req.body.passwordHash}${req.body.passwordSalt}`.trim()
              : `${hashPassword}CiAm`,
          salt: null,
        },
      };
    }
    const hashPassword = await passwordService.hashPassword(
      req.body.password.toString()
    );
    return {
      db: {
        hashPassword: hashPassword,
        salt: null,
      },
      cognito: {
        hashPassword: req.body.password,
        salt: null,
      },
    };
  }

  //https://mandaiwildlifereserve.atlassian.net/browse/CIAM-181
  async checkUserBelongWildPass(userEmail, userCognito) {
    if (!userCognito) return false;

    const membershipBelongWildPass = JSON.stringify(
      getOrCheck(userCognito, "custom:membership")
    ).includes(GROUP.WILD_PASS);

    const userGroupsAtCognito =
      await cognitoService.cognitoAdminListGroupsForUser(userEmail);

    const groups =
      userGroupsAtCognito.Groups && userGroupsAtCognito.Groups.length > 0
        ? userGroupsAtCognito.Groups.map((gr) => gr.GroupName)
        : [];

    return (
      (groups.includes(GROUP.WILD_PASS) &&
        !groups.includes(GROUP.MEMBERSHIP_PASSES)) ||
      membershipBelongWildPass
    );
  }

  async sendSQSMessage(body, action) {
    try {
      const data = {
        action: action,
        body: body,
      };

      const queueUrl = process.env.SQS_QUEUE_URL;
      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(data),
      });

      return await sqsClient.send(command);
    } catch (error) {
      loggerService.error(
        `UserSignupMembershipPasses.sendSQSMessage Error: ${error}`,
        body
      );
    }
  }

  //it can happen with normal signup flow + migration flow
  async handleUpdateUserBelongWildPass(
    req,
    userCognito,
    userDB,
    passwordCredential
  ) {
    try {
      loggerService.log(
        {
          user: {
            membership: req.body.group,
            action: "handleUpdateUserBelongWildPass",
            body: req.body,
            userCognito: userCognito,
            userDB: userDB,
            layer: "userSignupService.handleUpdateUserBelongWildPass",
          },
        },
        "[CIAM] Start handleUpdateUserBelongWildPass Service"
      );
      await cognitoService.cognitoAdminSetUserPassword(
        req.body.email,
        passwordCredential.cognito.hashPassword
      );

      const firstNameDB = userDB.given_name || "";
      const lastNameDB = userDB.family_name || "";
      const dobCognito = getOrCheck(userCognito, "birthdate") || null;
      const isTriggerUpdateInfo =
        firstNameDB !== req.body.firstName ||
        lastNameDB !== req.body.lastName ||
        (req.body.dob && dobCognito !== req.body.dob);

      if (isTriggerUpdateInfo) {
        await userModel.update(userDB.id, {
          given_name: req.body.firstName || undefined,
          family_name: req.body.lastName || undefined,
          birthdate: req.body.dob
            ? convertDateToMySQLFormat(req.body.dob)
            : undefined,
        });
        let userName = getOrCheck(userCognito, "name");
        const userFirstName = getOrCheck(userCognito, "given_name");
        const userLastName = getOrCheck(userCognito, "family_name");

        if (req.body.firstName && userFirstName) {
          userName = userName.replace(
            userFirstName.toString(),
            req.body.firstName
          );
        }

        if (req.body.firstName && userLastName) {
          userName = userName.replace(
            userLastName.toString(),
            req.body.firstName
          );
        }
        await cognitoService.cognitoAdminUpdateNewUser(
          [
            {
              Name: "given_name",
              Value: req.body.firstName,
            },
            {
              Name: "family_name",
              Value: req.body.lastName,
            },
            {
              Name: "name",
              Value: userName,
            },
          ],
          req.body.email
        );
        //require field when trigger generate passkit & cardface
        if (
          isTriggerUpdateInfo &&
          req.body.firstName &&
          req.body.lastName &&
          userDB.visualId
        ) {
          await this.sendSQSMessage(
            {
              firstName: req.body.firstName || userDB.given_name,
              lastName: req.body.lastName || userDB.family_name,
              dob: req.body.dob || dobCognito,
              mandaiID: getOrCheck(userCognito, "custom:mandai_id"),
              visualID: userDB.visualId,
              email: req.body.email,
            },
            "signUpMembershipPasses"
          );
        }
      }

      !!req.body.migrations &&
        (await empMembershipUserAccountsModel.updateByEmail(req.body.email, {
          picked: 1,
        }));
      loggerService.log(
        {
          user: {
            membership: req.body.group,
            action: "handleUpdateUserBelongWildPass",
            userCognito: userCognito,
            layer: "userSignupService.handleUpdateUserBelongWildPass",
          },
        },
        "[CIAM] End handleUpdateUserBelongWildPass Service - Success"
      );
      return {
        mandaiId: getOrCheck(userCognito, "custom:mandai_id"),
      };
    } catch (error) {
      req.body.migrations &&
        (await empMembershipUserAccountsModel.updateByEmail(req.body.email, {
          picked: 3,
        }));
      loggerService.error(
        {
          user: {
            membership: req.body.group,
            action: "handleUpdateUserBelongWildPass",
            body: req.body,
            userCognito: userCognito,
            userDB: userDB,
            error: `${error}`,
            layer: "userSignupService.handleUpdateUserBelongWildPass",
          },
        },
        {},
        "[CIAM] End handleUpdateUserBelongWildPass Service - Failed"
      );
      throw new Error(
        JSON.stringify(SignUpErrors.ciamEmailExists(req.body.language))
      );
    }
  }

  async signup(req) {
    loggerService.log(
      {
        user: {
          membership: req.body.group,
          action: "adminCreateNewUser",
          api_header: req.headers,
          api_body: req.body,
          layer: "userSignupService.signup",
        },
      },
      "[CIAM] Start Signup with FOs Service"
    );
    //prepare password information dynamic by migrations flag
    const passwordCredential = await this.preparePassword(req);

    //check user exists
    const userExistedInCognito = await this.isUserExistedInCognito(
      req.body.email
    );
    if (
      userExistedInCognito &&
      getOrCheck(userExistedInCognito, "custom:mandai_id")
    ) {
      //check is user email existed at wildpass group
      const userBelongWildpassGroup = await this.checkUserBelongWildPass(
        req.body.email,
        userExistedInCognito
      );

      const userInfo = await userModel.findFullMandaiId(req.body.email);

      if (
        userInfo &&
        userInfo.length &&
        userInfo[0] &&
        userBelongWildpassGroup
      ) {
        return await this.handleUpdateUserBelongWildPass(
          req,
          userExistedInCognito,
          userInfo[0],
          passwordCredential
        );
      }
      req.body.migrations &&
        (await empMembershipUserAccountsModel.updateByEmail(req.body.email, {
          picked: 3,
        }));
      throw new Error(
        JSON.stringify(SignUpErrors.ciamEmailExists(req.body.language))
      );
    }
    try {
      const mandaiId = this.generateMandaiId(req);

      //generate newsletter dynamic by migrations flag
      const newsletterMapping = this.generateNewsletter(req);

      //generate phoneNumber dynamic by migrations flag
      const phoneNumber = this.generatePhoneNumber(req);

      await cognitoService.cognitoAdminCreateUser({
        email: req.body.email,
        firstName: req.body.firstName ? req.body.firstName.trim() : "",
        lastName: req.body.lastName ? req.body.lastName.trim() : "",
        birthdate: req.body.dob || "",
        address: req.body.address || "",
        phoneNumber: phoneNumber,
        country: req.body.country || "",
        mandaiId: mandaiId,
        newsletter: newsletterMapping,
        source: getSource(req.headers["mwg-app-id"]).source
          ? getSource(req.headers["mwg-app-id"]).source
          : "",
      });

      // set user password in cognito
      await cognitoService.cognitoAdminSetUserPassword(
        req.body.email,
        passwordCredential.cognito.hashPassword
      );

      // set user into cognito group
      await cognitoService.cognitoAdminAddUserToGroup(
        req.body.email,
        req.body.group
      );

      //update picked = 1 in emp_membership+user_accounts tbl
      !!req.body.migrations &&
        (await empMembershipUserAccountsModel.updateByEmail(req.body.email, {
          picked: 1,
        }));

      await this.saveUserDB({
        req,
        phoneNumber,
        mandaiId,
        hashPassword: passwordCredential.db.hashPassword,
        saltPassword: passwordCredential.db.salt,
      });
      loggerService.log(
        {
          user: {
            membership: req.body.group,
            action: "adminCreateNewUser",
            layer: "userSignupService.signup",
            mandaiId,
          },
        },
        "[CIAM] End Signup with FOs Service - Success"
      );
      return {
        mandaiId,
      };
    } catch (error) {
      req.body.migrations &&
        (await empMembershipUserAccountsModel.updateByEmail(req.body.email, {
          picked: 2,
        }));
      const errorMessage =
        error && error.message ? JSON.parse(error.message) : "";
      loggerService.error(
        {
          user: {
            membership: req.body.group,
            action: "adminCreateNewUser",
            api_header: req.headers,
            api_body: req.body,
            layer: "userSignupService.signup",
          },
        },
        {},
        "[CIAM] End Signup with FOs Service - Failed"
      );
      if (
        errorMessage &&
        errorMessage.rawError &&
        errorMessage.rawError.includes("Invalid phone number format.")
      ) {
        throw new Error(
          JSON.stringify(
            CommonErrors.BadRequest(
              "phoneNumber",
              "phoneNumber_invalid",
              req.body.language
            )
          )
        );
      }
      if (errorMessage.status === "failed") {
        throw new Error(
          JSON.stringify(SignUpErrors.ciamSignUpErr(req.body.language))
        );
      }
      throw new Error(JSON.stringify(CommonErrors.NotImplemented()));
    }
  }
}

module.exports = new UserSignupService();
