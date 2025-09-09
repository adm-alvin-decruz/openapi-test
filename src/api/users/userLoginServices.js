const usersService = require("./usersServices");
const cognitoService = require("../../services/cognitoService");
const userCredentialModel = require("../../db/models/userCredentialModel");
const LoginErrors = require("../../config/https/errors/loginErrors");
const { getOrCheck } = require("../../utils/cognitoAttributes");
const loggerService = require("../../logs/logger");
const CommonErrors = require("../../config/https/errors/commonErrors");
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const { proceedSetPassword } = require("./helpers/loginHelper");
const UserCredentialEventService = require("./userCredentialEventService");
const { EVENTS } = require("../../utils/constants");
const { secrets } = require("../../services/secretsService");

class UserLoginService {
  async login(req) {
    const ciamSecrets = await secrets.getSecrets("ciam-microservice-lambda-config");
    const hashSecret = usersService.genSecretHash(
      req.body.email,
      ciamSecrets.USER_POOL_CLIENT_ID,
      ciamSecrets.USER_POOL_CLIENT_SECRET
    );
    const userHasFirstLogin = await userCredentialModel.findUserHasFirstLogin(req.body.email);

    const loginData = {
      email: req.body.email,
      password: req.body.password,
    };
    try {
      await proceedSetPassword(userHasFirstLogin, req.body.password, req.body.language);

      return await cognitoService.cognitoUserLogin(loginData, hashSecret);
    } catch (error) {
      loggerService.error(
        {
          user: {
            email: req.body.email,
            action: "login",
            body: req.body,
            layer: "userLoginServices.login",
            error: new Error(error),
          },
        },
        {},
        "[CIAM] Login Service trigger Login Execution - Failed"
      );
      throw new Error(JSON.stringify(LoginErrors.ciamLoginEmailOrPasswordInvalid(req.body.email, req.body.language)));
    }
  }

  async getUser(req) {
    try {
      const userCognito = await cognitoService.cognitoAdminGetUserByEmail(req.body.email);
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
            error: new Error(error),
          },
        },
        {},
        "[CIAM] Login Service Get User - Failed"
      );
      throw new Error(JSON.stringify(LoginErrors.ciamLoginEmailOrPasswordInvalid(req.body.email, req.body.language)));
    }
  }

  async updateUser(id, tokens) {
    const ciamSecrets = await secrets.getSecrets("ciam-microservice-lambda-config");
    try {
      const verifierAccessToken = CognitoJwtVerifier.create({
        userPoolId: process.env.USER_POOL_ID,
        tokenUse: "access",
        clientId: ciamSecrets.USER_POOL_CLIENT_ID,
      });

      const payloadAccessToken = await verifierAccessToken.verify(tokens.accessToken);

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
            error: new Error(error),
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
      throw new Error(JSON.stringify(LoginErrors.ciamLoginEmailOrPasswordInvalid(req.body.email, req.body.language)));
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
      //insert events
      await UserCredentialEventService.createEvent(
        {
          eventType: EVENTS.LOGIN,
          data: req.body.email,
          source: 1,
          status: 1,
        },
        userInfo.userId
      );
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
      await UserCredentialEventService.createEvent(
        {
          eventType: EVENTS.LOGIN,
          data: req.body.email,
          source: 1,
          status: 0,
        },
        null,
        req.body.email
      );
      loggerService.error(
        {
          user: {
            email: req.body.email,
            action: "login",
            layer: "userLoginServices.execute",
            error: new Error(error),
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
