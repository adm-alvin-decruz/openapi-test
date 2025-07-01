require("dotenv").config();
const cognitoService = require("../../services/cognitoService");
const { getOrCheck } = require("../../utils/cognitoAttributes");
const { generateRandomToken, generateSaltHash, maskKeyRandomly } = require("../../utils/common");
const MembershipErrors = require("../../config/https/errors/membershipErrors");
const userCredentialModel = require("../../db/models/userCredentialModel");
const {
  getCurrentUTCTimestamp,
  currentDateAddHours,
  convertDateFormat,
} = require("../../utils/dateUtils");
const { EXPIRE_TIME_HOURS, GROUP } = require("../../utils/constants");
const loggerService = require("../../logs/logger");
const emailService = require("../users/usersEmailService");
const userDBService = require("../users/usersDBService");
const { switchIsTurnOn } = require("../../helpers/dbSwitchesHelpers");
const { checkUserBelongSpecificGroup } = require("./helpers/checkMembershipGroups");
const UserCredentialEventService = require("./userCredentialEventService");
const { EVENTS } = require("../../utils/constants");

class UserResetPasswordService {
  async execute(req) {
    // check if wildpass, disallow to reset password
    const email = req.body.email;
    const language = req.body.language || 'en';
    let userExistedInCognito = null;
    let resetToken = "";
    try {
      userExistedInCognito = await cognitoService.cognitoAdminGetUserByEmail(email);
    } catch (error) {
      await Promise.reject(MembershipErrors.ciamMembershipRequestNoMPAccount(email, language))
    }

    const disableWPResetPassword = await switchIsTurnOn("disable_wp_reset_password");
    if (disableWPResetPassword) {
      //should inquiry user belong only wild pass when switch is turn on - reduce call APIs time to time
      try {
        const isUserBelongWildPass = await checkUserBelongSpecificGroup(email, GROUP.WILD_PASS, userExistedInCognito);
        loggerService.error(
            {
              user: {
                email,
                error: 'User belong wildpass can not reset password'
              }
            },
            {},
            '[CIAM-MAIN] Reset Password Service - Failed'
        );
        isUserBelongWildPass && await Promise.reject(MembershipErrors.ciamMembershipRequestNoMPAccount(email, language));
      } catch (error) {
        await Promise.reject(MembershipErrors.ciamMembershipRequestNoMPAccount(email, language))
      }
    }

    resetToken = generateRandomToken(16);
    const saltKey = generateSaltHash(resetToken);
    const passwordHash = generateSaltHash(resetToken, saltKey);
    try {
      const email = getOrCheck(userExistedInCognito, "email");

      // trigger lambda function send email with resetToken
      req.body.expiredAt = convertDateFormat(
        currentDateAddHours(EXPIRE_TIME_HOURS)
      );
      req.body.resetToken = resetToken;
      try {
        await this.prepareResetPasswordEmail(req);
      } catch (emailError) {
        await Promise.reject(MembershipErrors.ciamMembershipRequestNoMPAccount(email, language))
      }

      const userInfo = await userCredentialModel.findByUserEmail(email);
      //save db
      const dataUpdate = {
        password_hash: passwordHash,
        salt: saltKey,
        tokens: {
          ...userInfo.tokens,
          reset_token: {
            date_submitted: getCurrentUTCTimestamp(),
            expires_at: currentDateAddHours(EXPIRE_TIME_HOURS),
            reset_at: null,
          },
        },
      }
      await userCredentialModel.updateByUserEmail(email, dataUpdate);
      //insert events
      await UserCredentialEventService.createEvent({
        eventType: EVENTS.PASSWORD_RESET,
        data: {
          ...dataUpdate,
          resetToken
        },
        source: 1,
        status: 1
      }, null, email);
      return {
        email,
      };
    } catch (error) {
      await UserCredentialEventService.createEvent({
        eventType: EVENTS.PASSWORD_RESET,
        data: {
          ...req.body,
          resetToken,
          error: JSON.stringify(error)
        },
        source: 1,
        status: 0
      }, null, email);
      loggerService.error(
          {
            user: {
              resetToken: maskKeyRandomly(resetToken),
              saltKey: maskKeyRandomly(saltKey),
              passwordHash: maskKeyRandomly(passwordHash),
              email: email,
              error: new Error(error)
            }
          },
          {},
          '[CIAM-MAIN] Reset Password Service - Failed'
      );
      const errorMessage = error.message ? JSON.parse(error.message) : "";
      const errorData =
        errorMessage.data && errorMessage.data.name ? errorMessage.data : "";
      if (errorData.name && errorData.name === "UserNotFoundException") {
        throw new Error(JSON.stringify(MembershipErrors.ciamMembershipRequestNoMPAccount(email, language)));
      }
      throw new Error(JSON.stringify(MembershipErrors.ciamMembershipEmailInvalid(email, language)));
    }
  }

  async prepareResetPasswordEmail(req) {
    if (!req.body || !req.body.email) {
      throw new Error("Invalid request body: email is required");
    }

    try {
      const user = await userDBService.getDBUserByEmail(req.body);

      if (!user || Object.keys(user).length === 0) {
        throw new Error("User not found in database");
      }

      // email preparation logic
      req.body.firstName = user.given_name;
      req.body.ID = user.mandai_id;
      req.body.group = "membership-passes";
      req.body.emailAction = "reset-password";

      const response = await emailService.emailServiceAPI(req);
      loggerService.log(response, `PrepareResetPasswordEmail success:`);

      return true;
    } catch (error) {
      loggerService.error(
        new Error(error.message),
        {},
        `PrepareResetPasswordEmail failed:`
      );

      if (error.message === "User not found in database") {
        throw new Error("User not found in database");
      }

      // Handle specific database errors
      if (error.code === "ECONNREFUSED") {
        throw new Error("Database connection failed");
      }

      // For any other unexpected errors
      throw new Error(
        `Failed to prepare reset password email: ${error.message}`
      );
    }
  }
}

module.exports = new UserResetPasswordService();
