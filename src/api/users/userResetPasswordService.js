require("dotenv").config();
const cognitoService = require("../../services/cognitoService");
const { getOrCheck } = require("../../utils/cognitoAttributes");
const { generateSecretHash } = require("../../utils/common");
const MembershipErrors = require("../../config/https/errors/membershipErrors");
const LoginErrors = require("../../config/https/errors/loginErrors");

class UserResetPasswordService {
  async execute(reqBody) {
    const hashSecret = generateSecretHash(reqBody.email);
    try {
      const userCognito = await cognitoService.cognitoAdminGetUserByEmail(
        reqBody.email
      );
      const email = getOrCheck(userCognito, "email");
      await cognitoService.cognitoAdminResetUserPassword(email);
      return {
        email
      };
    } catch (error) {
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
          LoginErrors.ciamLoginEmailInvalid(reqBody.email, reqBody.language)
        )
      );
    }
  }
}

module.exports = new UserResetPasswordService();
