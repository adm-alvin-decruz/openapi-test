const crypto = require("crypto");
const cognitoService = require("../../services/cognitoService");
const { getOrCheck } = require("../../utils/cognitoAttributes");
const { getSource, getGroup } = require("../../utils/common");
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
const loggerService = require("../../logs/logger");

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
        `userSignupService.isUserExistedInCognito Error: ${error}`
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

  userMembershipModelExecution(membershipData) {
    const sql = `
      INSERT INTO user_memberships
      (user_id, name, visual_id, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      membershipData.user_id,
      membershipData.name,
      membershipData.visual_id,
      membershipData.expires_at,
      getCurrentUTCTimestamp(),
      getCurrentUTCTimestamp(),
    ];
    return commonService.replaceSqlPlaceholders(sql, params);
  }

  userCredentialModelExecution(credentialData) {
    const sql = `
      INSERT INTO user_credentials
      (user_id, username, password_hash, tokens, last_login, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      credentialData.user_id,
      credentialData.username,
      credentialData.password_hash,
      credentialData.tokens,
      credentialData.last_login,
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

  importUserInformation(userDB, req, hashPassword) {
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
        tokens: null,
        last_login: new Date().toISOString().slice(0, 19).replace("T", " "),
      }),
      this.userDetailModelExecution({
        user_id: userDB.user_id,
        phone_number: req.body.phoneNumber ? req.body.phoneNumber : null,
        zoneinfo: req.body.country ? req.body.country : null,
        address: req.body.address ? req.body.address : null,
        picture: req.body.picture ? req.body.picture : null,
        vehicle_iu: req.body.vehicleIU ? req.body.vehicleIU : null,
        vehicle_plate: req.body.vehiclePlate ? req.body.vehiclePlate : null,
        extra: req.body.extra ? req.body.extra : null,
      }),
    ].filter((work) => !!work);
  }

  async saveUserDB({ req, mandaiId, hashPassword }) {
    const source = getSource(req.headers["mwg-app-id"]);

    let userDB = null;
    try {
      userDB = await userModel.create({
        email: req.body.email,
        given_name: req.body.firstName,
        family_name: req.body.lastName,
        birthdate: req.body.dob,
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
          given_name: req.body.firstName,
          family_name: req.body.lastName,
          birthdate: req.body.dob,
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
      try {
        await pool.transaction(
          this.importUserInformation(userDB, req, hashPassword)
        );
      } catch (error) {
        await failedJobsModel.create({
          uuid: crypto.randomUUID(),
          name: "failedCreateNewUserInformation",
          action: "failed",
          data: this.importUserInformation(userDB, req, hashPassword).join("|"),
          source: 2,
          triggered_at: null,
          status: 0,
        });
      }
    }
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
      //hash password
      const hashPassword = await passwordService.hashPassword(
        req.body.password.toString()
      );

      await cognitoService.cognitoAdminCreateUser({
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        birthdate: req.body.dob,
        address: req.body.address,
        phoneNumber: req.body.phoneNumber,
        country: req.body.country,
        /*
        TODO: enhance add FO series later
         */
        groups: null,
        mandaiId: mandaiId,
        newsletter:
          req.body && req.body.newsletter && req.body.newsletter.name
            ? {
                name: "membership",
                type: "1",
                subscribe:
                  req.body.newsletter && !!req.body.newsletter.subscribe,
              }
            : null,
        source: getSource(req.headers["mwg-app-id"]).source
          ? getSource(req.headers["mwg-app-id"]).source
          : "",
      });
      await cognitoService.cognitoAdminSetUserPassword(
        req.body.email,
        req.body.password
      );
      await cognitoService.cognitoAdminAddUserToGroup(
        req.body.email,
        req.body.group
      );

      await this.saveUserDB({
        req,
        mandaiId,
        hashPassword,
      });

      return {
        mandaiId,
      };
    } catch (error) {
      loggerService.error(`userSignupService.signup Error: ${error}`);
      const errorMessage = JSON.parse(error.message);
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
