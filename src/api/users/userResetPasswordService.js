require("dotenv").config();
const cognitoService = require("../../services/cognitoService");
const { getOrCheck } = require("../../utils/cognitoAttributes");
const { generateRandomToken, generateSaltHash } = require("../../utils/common");
const MembershipErrors = require("../../config/https/errors/membershipErrors");
const userCredentialModel = require("../../db/models/userCredentialModel");
const {
  getCurrentUTCTimestamp,
  currentDateAddHours,
} = require("../../utils/dateUtils");
const { EXPIRE_TIME_HOURS } = require("../../utils/constants");
const loggerService = require("../../logs/logger");

class UserResetPasswordService {
  async execute(reqBody) {
    const resetToken = generateRandomToken(16);
    console.log('reset token', resetToken)
    const saltKey = generateSaltHash(resetToken);
    const passwordHash = generateSaltHash(resetToken, saltKey);
    try {
      const userCognito = await cognitoService.cognitoAdminGetUserByEmail(
        reqBody.email
      );
      const email = getOrCheck(userCognito, "email");

      //TODO: trigger lambda function send email with resetToken

      const userInfo = await userCredentialModel.findByUserEmail(email);
      //save db
      await userCredentialModel.updateByUserEmail(null, {
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
      loggerService.error(`Error userResetPasswordService.execute Error: ${error}`);
      const errorMessage = error.message ? JSON.parse(error.message) : "";
      const errorData =
        errorMessage.data && errorMessage.data.name ? errorMessage.data : "";
      if (errorData.name && errorData.name === "UserNotFoundException") {
        throw new Error(
          JSON.stringify(
            MembershipErrors.ciamMembershipUserNotFound(
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
}

module.exports = new UserResetPasswordService();
