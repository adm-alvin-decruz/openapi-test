const cognitoService = require("../../services/cognitoService");
const userCredentialModel = require("../../db/models/userCredentialModel");
const { getOrCheck } = require("../../utils/cognitoAttributes");
const loggerService = require("../../logs/logger");
const LogoutErrors = require("../../config/https/errors/logoutErrors");

class UserLogoutService {
  async getUser(token) {
    try {
      const userCognito = await cognitoService.cognitoAdminGetUserByAccessToken(
        token
      );
      const email = getOrCheck(userCognito, "email");
      const userDB = await userCredentialModel.findByUserEmail(email);
      return {
        userId: userDB.user_id ? userDB.user_id : "",
        email: email ? email : "",
      };
    } catch (error) {
      loggerService.error(`Error UserLogoutService.getUser. Error: ${error}`);
      throw new Error(JSON.stringify(LogoutErrors.ciamLogoutUserNotFound()));
    }
  }

  async execute(token) {
    const userInfo = await this.getUser(token);

    if (!userInfo.userId || !userInfo.email) {
      throw new Error(JSON.stringify(LogoutErrors.ciamLogoutUserNotFound()));
    }

    try {
      await cognitoService.cognitoUserLogout(userInfo.email);
      await userCredentialModel.updateTokens(userInfo.userId, null);
      return {
        email: userInfo.email,
      };
    } catch (error) {
      throw new Error(
        JSON.stringify({
          membership: {
            code: 500,
            mwgCode: "MWG_CIAM_INTERNAL_SERVER_ERROR",
            message: "Internal Server Error",
          },
          status: "failed",
          statusCode: 500,
        })
      );
    }
  }
}

module.exports = new UserLogoutService();
