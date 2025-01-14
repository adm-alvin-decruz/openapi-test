const cognitoService = require("../../services/cognitoService");
const userCredentialModel = require("../../db/models/userCredentialModel");
const { getOrCheck } = require("../../utils/cognitoAttributes");
const loggerService = require("../../logs/logger");
const LogoutErrors = require("../../config/https/errors/logoutErrors");
const CommonErrors = require("../../config/https/errors/common");

class UserLogoutService {
  async getUser(token, lang) {
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
      throw new Error(
        JSON.stringify(LogoutErrors.ciamLogoutUserNotFound(lang))
      );
    }
  }

  async execute(token, lang) {
    const userInfo = await this.getUser(token, lang);

    if (!userInfo.userId || !userInfo.email) {
      throw new Error(
        JSON.stringify(LogoutErrors.ciamLogoutUserNotFound(lang))
      );
    }

    try {
      await cognitoService.cognitoUserLogout(userInfo.email);
      await userCredentialModel.updateTokens(userInfo.userId, null);
      return {
        email: userInfo.email,
      };
    } catch (error) {
      throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
    }
  }
}

module.exports = new UserLogoutService();
