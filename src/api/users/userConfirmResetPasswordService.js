require("dotenv").config();
const UserValidateResetPasswordService = require("../users/userValidateResetPasswordService");
const cognitoService = require("../../services/cognitoService");
const { getOrCheck } = require("../../utils/cognitoAttributes");
const MembershipErrors = require("../../config/https/errors/membershipErrors");
const userCredentialModel = require("../../db/models/userCredentialModel");
const { getCurrentUTCTimestamp } = require("../../utils/dateUtils");
const { messageLang } = require("../../utils/common");

class UserConfirmResetPasswordService {
  async execute(body) {
    try {
      const rs = await UserValidateResetPasswordService.execute(
        body.passwordToken,
        body.language
      );

      const userCognito = await cognitoService.cognitoAdminGetUserByEmail(
        rs.email
      );

      const userEmail = getOrCheck(userCognito, "email");
      await cognitoService.cognitoAdminSetUserPassword(
        userEmail,
        body.newPassword
      );
      //save db
      await userCredentialModel.updateByUserEmail(rs.email, {
        tokens: {
          ...rs.tokens,
          reset_token: {
            ...rs.tokens.reset_token,
            reset_at: getCurrentUTCTimestamp(),
          },
        },
      });
      return {
        membership: {
          code: 200,
          mwgCode: "MWG_CIAM_USERS_EMAIL_RESET_PASSWORD_SUCCESS",
          message: messageLang("confirm_reset_password_success", body.language),
          passwordToken: body.passwordToken,
          resetCompletedAt: new Date(),
        },
        status: "success",
        statusCode: 200,
      };
    } catch (error) {
      //TODO: handle error saving to trail_table
      const errorMessage = error.message ? JSON.parse(error.message) : "";
      const errorData =
        errorMessage.data && errorMessage.data.name ? errorMessage.data : "";

      //catch error cognito not found user
      if (errorData.name && errorData.name === "UserNotFoundException") {
        throw new Error(
          JSON.stringify(
            MembershipErrors.ciamMembershipUserNotFound("", body.language)
          )
        );
      }

      //forward error message from validate token
      if (
        errorMessage &&
        errorMessage.membership &&
        errorMessage.membership.mwgCode
      ) {
        throw new Error(JSON.stringify(errorMessage));
      }

      throw new Error(
        JSON.stringify(
          MembershipErrors.ciamMembershipEmailInvalid("", body.language)
        )
      );
    }
  }
}

module.exports = new UserConfirmResetPasswordService();
