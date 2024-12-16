const cognitoService = require("../../services/cognitoService");
const { getOrCheck } = require("../../utils/cognitoAttributes");
const { getSource, getGroup } = require("../../utils/common");
const loggerService = require("../../logs/logger");
const SignUpErrors = require("../../config/https/errors/signupErrors");
const userConfig = require("../../config/usersConfig");
const crypto = require("crypto");
const passwordService = require("./userPasswordService");
const userModel = require("../../db/models/userModel");
const { getCurrentUTCTimestamp } = require("../../utils/dateUtils");
const userMembershipModel = require("../../db/models/userMembershipModel");
const userNewsletterModel = require("../../db/models/userNewletterModel");
const userCredentialModel = require("../../db/models/userCredentialModel");
const userDetailModel = require("../../db/models/userDetailsModel");
const pool = require("../../db/connections/mysqlConn");

class UserSignupService {
  async isUserExistedInCognito(req) {
    let userCognito = null;
    try {
      userCognito = await cognitoService.cognitoAdminGetUserByEmail(
        req.body.email
      );
    } catch (error) {
      loggerService.error("UserSignupService.isUserExisted Error:", error);
      throw error;
    }

    if (getOrCheck(userCognito, "custom:mandai_id")) {
      throw SignUpErrors.ciamEmailExists(req.body.language);
    }
  }

  generateMandaiId(req) {
    //set source
    const source = getSource(req.headers["mwg-app-id"]);
    const groupKey = getGroup(req.body.group);

    const length = req.body.group === "fow+" ? 10 : 11;
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
        console.log('1')
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

        console.log('2')
        //insert userMembership
        await userMembershipModel.create({
          user_id: user.user_id,
          name: req.body.group,
          visual_id: req.body.visualID ? req.body.visualID : "",
          expires_at: null, // todo: update expiry for fow fow+
        });

        console.log('3')
        //insert userNewsletter
        if (req.body.newsletter.subscribe) {
          await userNewsletterModel.create({
            user_id: user.user_id,
            name: req.body.newsletter.name ? req.body.newsletter.name : "",
            type: req.body.newsletter.type ? req.body.newsletter.type : '',
            subscribe: req.body.newsletter.subscribe,
          });
        }

        console.log('4')
        //insert userCredential
        await userCredentialModel.create({
          user_id: user.user_id,
          username: req.body.email, // cognito username is email
          password_hash: hashPassword,
          tokens: null,
          last_login: new Date().toISOString().slice(0, 19).replace("T", " "),
        });

        console.log('5')
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

        console.log('6')
        return {
          success: "save into db success",
        };
      });
    } catch (error) {
      console.log('error', error)
      return {
        failed: "save into db failed",
      };
    }
  }

  async signup(req) {
    //check user exists
    await this.isUserExistedInCognito(req);
    const mandaiId = this.generateMandaiId(req);
    /*TODO
     * Generate CardFace need to be confirm
     */
    //hash password
    const hashPassword = await passwordService.hashPassword(
      req.body.password.toString()
    );

    const cognitoCreateUser = await cognitoService.cognitoAdminCreateUser({
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
      newsletter: req.body.newsletter.subscribe
        ? {
            name: req.body.newsletter.name ? req.body.newsletter.name :  "",
            type: req.body.newsletter.type ? req.body.newsletter.type : "",
            subscribe: req.body.newsletter.subscribe,
          }
        : null,
      source: getSource(req.headers["mwg-app-id"]).source ? getSource(req.headers["mwg-app-id"]).source : "",
    });
    if (cognitoCreateUser.status && cognitoCreateUser.status === "failed") {
      loggerService.error(
        `cognitoService.cognitoAdminCreateUser Error: ${cognitoCreateUser.data}`
      );
      throw SignUpErrors.ciamSignUpErr(req.body.language);
    }

    const cognitoSetPassword = await cognitoService.cognitoAdminSetUserPassword(
      req.body.email,
      req.body.password
    );
    if (cognitoSetPassword.status && cognitoSetPassword.status === "failed") {
      loggerService.error(
        `cognitoService.cognitoAdminCreateUser Error: ${cognitoSetPassword.data}`
      );
      throw SignUpErrors.ciamSignUpErr(req.body.language);
    }

    //update user into db - apply rollback mechanism
    const saveUser = await this.saveUserDB({
      req,
      mandaiId,
      hashPassword,
    });
    console.log('saveUser', saveUser)
    if (saveUser && saveUser.failed) {
      loggerService.error("UserSignupService.saveUserDB Error:");
      throw SignUpErrors.ciamSignUpErr(req.body.language);
    }
    return {
      mandaiId,
    };
  }
}

module.exports = new UserSignupService();
