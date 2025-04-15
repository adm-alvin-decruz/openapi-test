const cognitoService = require("../../services/cognitoService");
const userCredentialModel = require("../../db/models/userCredentialModel");
const loggerService = require("../../logs/logger");
const LogoutErrors = require("../../config/https/errors/logoutErrors");
const { maskKeyRandomly } = require("../../utils/common");

class UserLogoutService {
  async getUser(token, body) {
    try {
      const userDB = await userCredentialModel.findByUserEmailOrMandaiId(body.email || '', body.mandaiId || '');
      return {
        userId: userDB.user_id ? userDB.user_id : "",
        email: userDB.email,
      };
    } catch (error) {
      loggerService.error(
        {
          user: {
            token: maskKeyRandomly(token),
            layer: "userLogoutServices.getUser",
            error: new Error(error),
          },
        },
        {},
        "[CIAM] Get User For Logout Request - Failed"
      );
      throw new Error(JSON.stringify(LogoutErrors.ciamLogoutUserNotFound(body.language)));
    }
  }

  async execute(token, body) {
    const userInfo = await this.getUser(token, body);
    if (!userInfo.userId) {
      throw new Error(JSON.stringify(LogoutErrors.ciamLogoutUserNotFound(body.language)));
    }

    try {
      await cognitoService.cognitoUserLogout(userInfo.email);
      await userCredentialModel.updateByUserId(userInfo.userId, {
        tokens: null,
      });
    } catch (error) {
      throw new Error(JSON.stringify(LogoutErrors.ciamLogoutUserNotFound(body.language)));
    }
  }
}

module.exports = new UserLogoutService();
