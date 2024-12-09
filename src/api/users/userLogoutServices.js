const {
  getUserCognitoInfoByAccessToken,
} = require("../../api/supports/supportCognitoServices");
const cognitoService = require("../../services/cognitoService");
const userCredentialModel = require("../../db/models/userCredentialModel");

class UserLogoutService {
  constructor() {
    this.message = null;
  }

  async getUserEmailCognito(token) {
    const result = await getUserCognitoInfoByAccessToken(token);
    if (["failed", "not found"].includes(result.status)) {
      return "";
    }
    return result.UserAttributes.find((ele) => ele.Name === "email").Value;
  }

  async updateUser(id) {
    try {
      await userCredentialModel.updateTokens(id, {
        tokens: null,
      });
      return {
        message: "success",
      };
    } catch (error) {
      return {
        message: JSON.stringify(error),
      };
    }
  }

  async execute(token) {
    // check user existed in cognito
    const userEmail = await this.getUserEmailCognito(token);
    if (!userEmail) {
      return {
        errorMessage: "User not exists",
      };
    }

    //check user existed in db
    const userInfo = await userCredentialModel.findByUserEmail(userEmail);
    if (!userInfo.id) {
      return {
        errorMessage: "User not exists",
      };
    }

    //logout
    const logoutSession = await cognitoService.cognitoUserLogout(userEmail);
    if (logoutSession.message !== "success") {
      return {
        errorMessage: logoutSession.message,
      };
    }

    //update user tokens
    const updateRecord = await this.updateUser(userInfo.id);
    if (updateRecord.message !== "success") {
      return {
        errorMessage: updateRecord.message,
      };
    }

    return {
      message: "Logout successfully",
    };
  }
}

module.exports = new UserLogoutService();
