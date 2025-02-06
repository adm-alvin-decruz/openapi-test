const crypto = require("crypto");
const cognitoService = require("../../services/cognitoService");
const { getOrCheck } = require("../../utils/cognitoAttributes");
const {
  getSource,
  getGroup,
  formatPhoneNumber,
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

class UserSignupService {
  async isUserExistedInCognito(email) {
    try {
      const userCognito = await cognitoService.cognitoAdminGetUserByEmail(
        email
      );

      return getOrCheck(userCognito, "custom:mandai_id");
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      const errorData =
        errorMessage.data && errorMessage.data.name ? errorMessage.data : "";
      if (errorData.name && errorData.name === "UserNotFoundException") {
        return false;
      }
      loggerService.error(
        `userSignupService.isUserExistedInCognito Error: ${error} - userEmail: ${email}`
      );
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
      } catch (error) {
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

  async signup(req) {
    //check user exists
    const isUserExisted = await this.isUserExistedInCognito(req.body.email);
    if (isUserExisted) {
      throw new Error(
        JSON.stringify(SignUpErrors.ciamEmailExists(req.body.language))
      );
    }
    try {
      const mandaiId = this.generateMandaiId(req);

      //prepare password information dynamic by migrations flag
      const passwordCredential = await this.preparePassword(req);

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

      return {
        mandaiId,
      };
    } catch (error) {
      loggerService.error(
        `userSignupService.signup Error: ${error} - userEmail: ${req.body.email}`,
        req.body
      );
      const errorMessage =
        error && error.message ? JSON.parse(error.message) : "";
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
