require("dotenv").config();
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const loggerService = require("../../logs/logger");
const userModel = require("../../db/models/userModel");
const { formatDateToMySQLDateTime } = require("../../utils/dateUtils");

class UserRefreshTokenService {
  async execute(accessToken, body) {
    const verifierAccessToken = CognitoJwtVerifier.create({
      userPoolId: process.env.USER_POOL_ID,
      tokenUse: "access",
      clientId: process.env.USER_POOL_CLIENT_ID,
    });
    let email = "";
    if (body.includeEmail) {
      const userInfo = await userModel.findByEmailOrMandaiId(
        null,
        body.mandaiId
      );
      email = userInfo.email;
    }
    try {
      const payloadAccessToken = await verifierAccessToken.verify(accessToken);
      return {
        expired_at:
          formatDateToMySQLDateTime(new Date(payloadAccessToken.exp * 1000)) ||
          null,
        valid: true,
        email,
      };
    } catch (error) {
      loggerService.error(
        {
          mandaiId: body.mandaiId,
          error: new Error(error),
          layer: "UserRefreshTokenService.execute",
        },
        {},
        "UserRefreshTokenService Failed"
      );
      if (
        error &&
        error.message &&
        error.message.includes("Token expired at")
      ) {
        return {
          expired_at: formatDateToMySQLDateTime(new Date()) || null,
          valid: false,
          email,
        };
      }
      return {
        expired_at: null,
        valid: false,
        email,
      };
    }
  }
}

module.exports = new UserRefreshTokenService();
