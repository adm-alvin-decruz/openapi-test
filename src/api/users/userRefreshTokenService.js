require("dotenv").config();
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const loggerService = require("../../logs/logger");
const userModel = require("../../db/models/userModel");
const { formatDateToMySQLDateTime } = require("../../utils/dateUtils");
const UserCredentialEventService = require("./userCredentialEventService");
const { EVENTS } = require("../../utils/constants");
const { default: secrets } = require("../../services/secretsService");

let ciamSecrets = null;

(async () => {
  ciamSecrets = await secrets.getSecrets("ciam-microservice-lambda-config");
})();

class UserRefreshTokenService {
  constructor() {
    this.cognitoClientId = ciamSecrets.USER_POOL_CLIENT_ID;
  }
  async execute(accessToken, body) {
    const verifierAccessToken = CognitoJwtVerifier.create({
      userPoolId: process.env.USER_POOL_ID,
      tokenUse: "access",
      clientId: this.cognitoClientId,
    });
    let email = body.email ? body.email : "";
    if (body.includeEmail) {
      const userInfo = await userModel.findByEmailOrMandaiId(email, body.mandaiId);
      email = userInfo.email;
    }
    try {
      const payloadAccessToken = await verifierAccessToken.verify(accessToken);
      await UserCredentialEventService.createEvent(
        {
          eventType: EVENTS.REFRESH_TOKEN,
          data: body,
          source: 1,
          status: 1,
        },
        null,
        body.email || "",
        body.mandaiId || ""
      );
      return {
        expired_at: formatDateToMySQLDateTime(new Date(payloadAccessToken.exp * 1000)) || null,
        valid: true,
        email,
      };
    } catch (error) {
      loggerService.error(
        {
          email: email,
          mandaiId: body.mandaiId,
          error: new Error(error),
          layer: "UserRefreshTokenService.execute",
        },
        {},
        "UserRefreshTokenService Failed"
      );
      if (error && error.message && error.message.includes("Token expired at")) {
        return {
          expired_at: formatDateToMySQLDateTime(new Date()) || null,
          valid: false,
          email,
        };
      }
      await UserCredentialEventService.createEvent(
        {
          eventType: EVENTS.REFRESH_TOKEN,
          data: {
            ...body,
            error: JSON.stringify(error),
          },
          source: 1,
          status: 0,
        },
        null,
        body.email || "",
        body.mandaiId || ""
      );
      return {
        expired_at: null,
        valid: false,
        email,
      };
    }
  }
}

module.exports = new UserRefreshTokenService();
