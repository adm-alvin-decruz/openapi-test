const SupportUserServices = require("../../api/supports/supportUserServices");
const usersService = require("./usersServices");
const cognitoService = require("../../services/cognitoService");
const userCredentialModel = require("../../db/models/userCredentialModel");

class UserLoginService {
  constructor() {
    this.user = null;
  }

  async login(req) {
    const hashSecret = usersService.genSecretHash(
      req.body.email,
      process.env.USER_POOL_CLIENT_ID,
      process.env.USER_POOL_CLIENT_SECRET
    );
    const loginResult = await cognitoService.cognitoUserLogin(req, hashSecret);
    if (loginResult["cognitoLoginError"]) {
      return {
        errorMessage: loginResult["cognitoLoginError"],
      };
    }
    return {
      ...loginResult["cognitoLoginResult"],
    };
  }

  async getUser(req) {
    const result = await SupportUserServices.getUserAllInfoService(req);
    if (["failed", "not found"].includes(result.cognito.status) || !result.db) {
      return {
        errorMessage: "User not exist",
      };
    }
    const cognitoUser = {};
    result.cognito.UserAttributes.map((ele) => {
      const key = ele.Name.includes("custom:")
        ? ele.Name.replace(/custom:/g, "")
        : ele.Name;
      const value = ele.Value;
      return Object.assign(cognitoUser, {
        [key]: value,
      });
    });
    return {
      db: result.db,
      cognito: {
        ...cognitoUser,
        membership: cognitoUser.membership
          ? JSON.parse(cognitoUser.membership)
          : [],
        createdAt: result.cognito.UserCreateDate,
        updatedAt: result.cognito.UserLastModifiedDate,
        status: result.cognito.UserStatus,
        id: result.cognito.Username,
      },
    };
  }

  async updateUser(id, tokens) {
    try {
      await userCredentialModel.updateTokens(id, tokens);
      return {
        message: "success",
      };
    } catch (error) {
      return {
        message: JSON.stringify(error),
      };
    }
  }

  async execute(req) {
    // check user existed
    const userInfo = await this.getUser(req);
    if (userInfo.errorMessage) {
      return (this.user = {
        errorMessage: userInfo.errorMessage,
      });
    }

    // login
    const loginSession = await this.login(req);
    if (loginSession.errorMessage) {
      return (this.user = {
        errorMessage: loginSession.errorMessage,
      });
    }

    //update user tokens
    const updateRecord = await this.updateUser(userInfo.db.credentials.id, {
      tokens: loginSession,
      last_login: userInfo.cognito.updatedAt,
    });
    if (updateRecord.message !== "success") {
      return (this.user = {
        errorMessage: updateRecord.message,
      });
    }

    return (this.user = {
      ...userInfo,
      accessToken: loginSession.accessToken,
      refreshToken: loginSession.refreshToken,
    });
  }
}

module.exports = new UserLoginService();
