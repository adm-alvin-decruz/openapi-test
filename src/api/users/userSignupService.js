const crypto = require("crypto");
const cognitoService = require("../../services/cognitoService");
const { getOrCheck } = require("../../utils/cognitoAttributes");
const { getSource, getGroup } = require("../../utils/common");
const loggerService = require("../../logs/logger");
const SignUpErrors = require("../../config/https/errors/signupErrors");
const passwordService = require("./userPasswordService");
const userModel = require("../../db/models/userModel");
const { getCurrentUTCTimestamp } = require("../../utils/dateUtils");
const userMembershipModel = require("../../db/models/userMembershipModel");
const userNewsletterModel = require("../../db/models/userNewletterModel");
const userCredentialModel = require("../../db/models/userCredentialModel");
const userDetailModel = require("../../db/models/userDetailsModel");
const pool = require("../../db/connections/mysqlConn");
const CommonErrors = require("../../config/https/errors/common");
const { GROUP } = require("../../utils/constants");

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

      if (errorMessage.status === "failed") {
        throw new Error(JSON.stringify(CommonErrors.NotImplemented()));
      }
    }
  }

  generateMandaiId(req) {
    //set source
    const source = getSource(req.headers["mwg-app-id"]);
    const groupKey = getGroup(req.body.group);

    const length = req.body.group === GROUP.FOW_PLUS ? 10 : 11;
    const hash = crypto
      .createHash("sha256")
      .update(
        `${req.body.email}${req.body.dob}${req.body.firstName}${req.body.lastName}`
      )
      .digest("hex");
    const numbers = hash.replace(/\D/g, "");
    return `M${groupKey}${source.sourceKey}${numbers.slice(0, length)}`;
  }

  async saveUserDB({ req, mandaiId, hashPassword }) {
    const source = getSource(req.headers["mwg-app-id"]);

    try {
      await pool.transaction(async () => {
        //insert user
        const user = await userModel.create({
          email: req.body.email,
          given_name: req.body.firstName,
          family_name: req.body.lastName,
          birthdate: req.body.dob,
          mandai_id: mandaiId,
          source: source.sourceDB,
          active: true,
          created_at: getCurrentUTCTimestamp(),
        });

        //insert userMembership
        await userMembershipModel.create({
          user_id: user.user_id,
          name: req.body.group,
          visual_id: req.body.visualID ? req.body.visualID : "",
          expires_at: null, // todo: update expiry for fow fow+
        });

        //insert userNewsletter
        if (req.body.newsletter.subscribe) {
          await userNewsletterModel.create({
            user_id: user.user_id,
            name: req.body.newsletter.name ? req.body.newsletter.name : "",
            type: req.body.newsletter.type ? req.body.newsletter.type : "",
            subscribe: req.body.newsletter.subscribe,
          });
        }

        //insert userCredential
        await userCredentialModel.create({
          user_id: user.user_id,
          username: req.body.email, // cognito username is email
          password_hash: hashPassword,
          tokens: null,
          last_login: new Date().toISOString().slice(0, 19).replace("T", " "),
        });

        //insert userDetail
        await userDetailModel.create({
          user_id: user.user_id,
          phone_number: req.body.phone ? req.body.phone : null,
          zoneinfo: req.body.zone ? req.body.zone : null,
          address: req.body.address ? req.body.address : null,
          picture: req.body.picture ? req.body.picture : null,
          vehicle_iu: req.body.vehicleIU ? req.body.vehicleIU : null,
          vehicle_plate: req.body.vehiclePlate ? req.body.vehiclePlate : null,
          extra: req.body.extra ? req.body.extra : null,
        });
      });
    } catch (error) {
      loggerService.error(`userSignupService.saveUserDB Error: ${error}`);
      throw new Error(
        JSON.stringify({
          dbProceed: "failed",
        })
      );
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
      /*TODO
       * Generate CardFace need to be confirm
       */
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
        groups: [
          {
            name: req.body.group,
            visualID: "",
            expiry: "",
          },
        ],
        mandaiId: mandaiId,
        newsletter:
          req.body.newsletter && req.body.newsletter.subscribe
            ? {
                name: req.body.newsletter.name ? req.body.newsletter.name : "",
                type: req.body.newsletter.type ? req.body.newsletter.type : "",
                subscribe: req.body.newsletter.subscribe,
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

      //update user into db - apply rollback mechanism
      await this.saveUserDB({
        req,
        mandaiId,
        hashPassword,
      });

      return {
        mandaiId,
      };
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      if (errorMessage.dbProceed) {
        //need align with Kay about rollback user when saveDB failed
        await cognitoService.cognitoAdminDeleteUser(req.body.email);
      }
      if (errorMessage.dbProceed || errorMessage.status === "failed") {
        throw new Error(
          JSON.stringify(SignUpErrors.ciamSignUpErr(req.body.language))
        );
      }
      throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
    }
  }
}

module.exports = new UserSignupService();
