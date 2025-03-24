const usersService = require("./usersServices");
const cognitoService = require("../../services/cognitoService");
const userCredentialModel = require("../../db/models/userCredentialModel");
const LoginErrors = require("../../config/https/errors/loginErrors");
const { getOrCheck } = require("../../utils/cognitoAttributes");
const loggerService = require("../../logs/logger");
const CommonErrors = require("../../config/https/errors/commonErrors");
const passwordService = require("./userPasswordService");
const { passwordPattern } = require("../../utils/common");
const { CognitoJwtVerifier } = require("aws-jwt-verify");

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

    const loginData = {
      email: req.body.email,
      password: req.body.password
    }
    await this.proceedSetPassword(userHasFirstLogin, req.body.password, req.body.language);
    try {
      return await cognitoService.cognitoUserLogin(loginData, hashSecret);
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
        JSON.stringify(LoginErrors.ciamLoginEmailOrPasswordInvalid(req.body.email, req.body.language))
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
          LoginErrors.ciamLoginEmailOrPasswordInvalid(req.body.email, req.body.language)
        )
      );
    }
  }

  async updateUser(id, tokens) {
    try {
      const verifierAccessToken = CognitoJwtVerifier.create({
        userPoolId: process.env.USER_POOL_ID,
        tokenUse: "access",
        clientId: process.env.USER_POOL_CLIENT_ID,
      });

      const payloadAccessToken = await verifierAccessToken.verify(
        tokens.accessToken
      );

      await userCredentialModel.updateByUserId(id, {
        tokens: JSON.stringify({
          ...tokens,
          userSubId: payloadAccessToken.sub || "",
        }),
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
          LoginErrors.ciamLoginEmailOrPasswordInvalid(req.body.email, req.body.language)
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

  async proceedSetPassword(userInfo, password, lang = 'en') {
    //if user first login is empty - do nothing
    if (!userInfo || !userInfo.password_hash || !userInfo.password_salt) {
      return;
    }

    //if match argon - user is normal flow - do nothing
    if (userInfo.password_hash.startsWith('$argon2')) {
      return;
    }

    //this is step for set password with user migration
    const passwordHashed = passwordService.createPassword(password, userInfo.password_salt);
    const isMatchedPassword = passwordHashed.toUpperCase() === userInfo.password_hash.toUpperCase();

    if (isMatchedPassword) {
      if (!passwordPattern(password)) {
        throw new Error(JSON.stringify(CommonErrors.PasswordRequireChange(lang)));
      }

      try {
        await cognitoService.cognitoAdminSetUserPassword(userInfo.username, password);
        const hashPassword = await passwordService.hashPassword(password);
        await userCredentialModel.updateByUserEmail(userInfo.username, {
          password_hash: hashPassword,
          salt: null
        });
      } catch (error) {
        loggerService.error(
          {
            user: {
              action: "proceedSetPassword",
              email: userInfo.username,
              layer: "userLoginServices.proceedSetPassword",
              error: new Error(error),
            },
          },
          {},
          "[CIAM] Proceed Set Password - Failed"
        );
      }
    }
  }
}

module.exports = new UserLoginService();
