const usersService = require("./usersServices");
const cognitoService = require("../../services/cognitoService");
const userCredentialModel = require("../../db/models/userCredentialModel");
const LoginErrors = require("../../config/https/errors/loginErrors");
const { getOrCheck } = require("../../utils/cognitoAttributes");
const loggerService = require("../../logs/logger");
const CommonErrors = require("../../config/https/errors/common");

class UserLoginService {
  async login(req) {
    const hashSecret = usersService.genSecretHash(
      req.body.email,
      process.env.USER_POOL_CLIENT_ID,
      process.env.USER_POOL_CLIENT_SECRET
    );
    try {
      return await cognitoService.cognitoUserLogin(req, hashSecret);
    } catch (error) {
      loggerService.error(`Error UserLoginService.login. Error: ${error}`, req.body);
      throw new Error(
        JSON.stringify(CommonErrors.UnauthorizedException(req.body.language))
      );
    }
  }

  async getUser(req) {
    try {
      const userCognito = await cognitoService.cognitoAdminGetUserByEmail(
        req.body.email
      );
      const userDB = await userCredentialModel.findByUserEmail(req.body.email);
      return {
        email: getOrCheck(userCognito, "email"),
        mandaiId: getOrCheck(userCognito, "custom:mandai_id"),
        userId: userDB.user_id ? userDB.user_id : "",
      };
    } catch (error) {
      loggerService.error(
        `Error UserLoginService.getUser. Error: ${error}`,
        req.body
      );
      throw new Error(
        JSON.stringify(
          LoginErrors.ciamLoginUserNotFound(req.body.email, req.body.language)
        )
      );
    }
  }

  async updateUser(id, tokens) {
    try {
      await userCredentialModel.updateTokens(id, tokens);
    } catch (error) {
      loggerService.error(
        `Error UserLoginService.updateUser. Error: ${error} - userId: ${id}`,
        tokens
      );
      throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
    }
  }

  async execute(req) {
    const userInfo = await this.getUser(req);
    if (!userInfo.userId || !userInfo.email || !userInfo.mandaiId) {
      throw new Error(
        JSON.stringify(
          LoginErrors.ciamLoginUserNotFound(req.body.email, req.body.language)
        )
      );
    }
    try {
      const loginSession = await this.login(req);
      await this.updateUser(userInfo.userId, loginSession);
      return {
        accessToken: loginSession.accessToken,
        mandaiId: userInfo.mandaiId,
        email: userInfo.email,
      };
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      throw new Error(JSON.stringify(errorMessage));
    }
  }
}

module.exports = new UserLoginService();
