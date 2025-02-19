const usersService = require("./usersServices");
const cognitoService = require("../../services/cognitoService");
const userCredentialModel = require("../../db/models/userCredentialModel");
const LoginErrors = require("../../config/https/errors/loginErrors");
const { getOrCheck } = require("../../utils/cognitoAttributes");
const loggerService = require("../../logs/logger");
const CommonErrors = require("../../config/https/errors/common");
const passwordService = require("./userPasswordService");
const { passwordPattern } = require("../../utils/common");

class UserLoginService {
  async login(req) {
    const hashSecret = usersService.genSecretHash(
      req.body.email,
      process.env.USER_POOL_CLIENT_ID,
      process.env.USER_POOL_CLIENT_SECRET
    );
    const userHasFirstLogin = await userCredentialModel.findUserHasFirstLogin(
      req.body.email
    );
    if (
      userHasFirstLogin &&
      userHasFirstLogin.username &&
      (!userHasFirstLogin.password_hash || !userHasFirstLogin.password_salt)
    ) {
      throw new Error(
        JSON.stringify(CommonErrors.PasswordRequireChange(req.body.language))
      );
    }
    const isMatchedPasswordForFirstLogin =
      userHasFirstLogin &&
      userHasFirstLogin.username &&
      userHasFirstLogin.password_hash &&
      userHasFirstLogin.password_salt
        ? passwordService
            .createPassword(req.body.password, userHasFirstLogin.password_salt)
            .toUpperCase() === userHasFirstLogin.password_hash.toUpperCase()
        : false;

    if (isMatchedPasswordForFirstLogin && !passwordPattern(req.body.password)) {
      throw new Error(
        JSON.stringify(CommonErrors.PasswordRequireChange(req.body.language))
      );
    }
    try {
      const loginRs = await cognitoService.cognitoUserLogin(
        {
          email: req.body.email,
          password: isMatchedPasswordForFirstLogin
            ? `${userHasFirstLogin.password_hash}${userHasFirstLogin.password_salt}`.trim()
            : req.body.password,
        },
        hashSecret
      );
      isMatchedPasswordForFirstLogin &&
        (await cognitoService.cognitoAdminSetUserPassword(
          req.body.email,
          req.body.password
        ));
      return loginRs;
    } catch (error) {
      loggerService.error(
        {
          user: {
            email: req.body.email,
            action: "login",
            body: req.body,
            layer: "userLoginServices.login",
            error: `${error}`,
          },
        },
        {},
        "[CIAM] Login Service trigger Login Execution - Failed"
      );
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
        {
          user: {
            email: req.body.email,
            action: "login",
            body: req.body,
            layer: "userLoginServices.getUser",
            error: `${error}`,
          },
        },
        {},
        "[CIAM] Login Service Get User - Failed"
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
      await userCredentialModel.updateByUserId(id, {
        tokens: JSON.stringify(tokens),
        last_login: new Date().toISOString().slice(0, 19).replace("T", " "),
      });
    } catch (error) {
      loggerService.error(
        {
          user: {
            userId: id,
            action: "login",
            layer: "userLoginServices.getUser",
            error: `${error}`,
          },
        },
        {},
        "[CIAM] Login Service Update User - Failed"
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
      loggerService.log(
        {
          user: {
            email: req.body.email,
            action: "login",
            layer: "userLoginServices.execute",
          },
        },
        "[CIAM] Start Login Service "
      );
      const loginSession = await this.login(req);
      await this.updateUser(userInfo.userId, loginSession);
      loggerService.log(
        {
          user: {
            email: req.body.email,
            action: "login",
            layer: "userLoginServices.execute",
          },
        },
        "[CIAM] End Login Service - Success"
      );
      return {
        accessToken: loginSession.accessToken,
        mandaiId: userInfo.mandaiId,
        email: userInfo.email,
      };
    } catch (error) {
      loggerService.log(
        {
          user: {
            email: req.body.email,
            action: "login",
            layer: "userLoginServices.execute",
            error: `${error}`,
          },
        },
        {},
        "[CIAM] End Login Service - Failed"
      );
      const errorMessage = JSON.parse(error.message);
      throw new Error(JSON.stringify(errorMessage));
    }
  }
}

module.exports = new UserLoginService();
