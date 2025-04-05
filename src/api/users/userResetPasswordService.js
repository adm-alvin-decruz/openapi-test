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
const { EXPIRE_TIME_HOURS } = require("../../utils/constants");
const loggerService = require("../../logs/logger");
const emailService = require("../users/usersEmailService");
const userDBService = require("../users/usersDBService");

class UserResetPasswordService {
  async execute(req) {
    // check if wildpass, disallow to reset password
    let reqBody = req.body;
    let userExistedInCognito = null;
    try {
      userExistedInCognito = await cognitoService.cognitoAdminGetUserByEmail(reqBody.email);
    } catch (error) {
      await Promise.reject(MembershipErrors.ciamMembershipEmailInvalid(
          reqBody.email,
          reqBody.language
      ))
    }

    if (userExistedInCognito) {
      const isUserBelongWildPass = await cognitoService.checkUserBelongWildPass(reqBody.email, userExistedInCognito);
      if (isUserBelongWildPass) {
        loggerService.error(
            {
              user: {
                email: reqBody.email,
                error: 'User belong wildpass can not reset password'
              }
            },
            {},
            '[CIAM-MAIN] Reset Password Service - Failed'
        );
        await Promise.reject(MembershipErrors.ciamMembershipRequestNoMPAccount(
            reqBody.email,
            reqBody.language
        ))
      }
    }

    const resetToken = generateRandomToken(16);
    console.log("reset token", resetToken);
    const saltKey = generateSaltHash(resetToken);
    const passwordHash = generateSaltHash(resetToken, saltKey);
    try {
      const userCognito = await cognitoService.cognitoAdminGetUserByEmail(
        reqBody.email
      );
      const email = getOrCheck(userCognito, "email");

      // trigger lambda function send email with resetToken
      req.body.expiredAt = convertDateFormat(
        currentDateAddHours(EXPIRE_TIME_HOURS)
      );
      req.body.resetToken = resetToken;
      try {
        await this.prepareResetPasswordEmail(req);
      } catch (emailError) {
        await Promise.reject(MembershipErrors.ciamMembershipRequestNoMPAccount(
            reqBody.email,
            reqBody.language
        ))
      }

      const userInfo = await userCredentialModel.findByUserEmail(email);
      //save db
      await userCredentialModel.updateByUserEmail(email, {
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
      });
      return {
        email,
      };
    } catch (error) {
      //TODO: handle error saving to trail_table
      loggerService.error(
          {
            user: {
              resetToken: maskKeyRandomly(resetToken),
              saltKey: maskKeyRandomly(saltKey),
              passwordHash: maskKeyRandomly(passwordHash),
              email: reqBody.email,
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
        throw new Error(
          JSON.stringify(
            MembershipErrors.ciamMembershipRequestNoMPAccount(
              reqBody.email,
              reqBody.language
            )
          )
        );
      }
      throw new Error(
        JSON.stringify(
          MembershipErrors.ciamMembershipEmailInvalid(
            reqBody.email,
            reqBody.language
          )
        )
      );
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
