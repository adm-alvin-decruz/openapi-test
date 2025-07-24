require("dotenv").config();
const { formatDateToMySQLDateTime } = require("../../utils/dateUtils");
const cognitoService = require("../../services/cognitoService");
const { getOrCheck } = require("../../utils/cognitoAttributes");
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const loggerService = require("../../logs/logger");
const { default: secrets } = require("../../services/secretsService");

let ciamSecrets = null;

(async () => {
  ciamSecrets = await secrets.getSecrets("ciam-microservice-lambda-config");
})();

class UserVerifyTokenService {
  constructor() {
    this.cognitoClientId = ciamSecrets.USER_POOL_CLIENT_ID;
  }

  async verifyToken(accessToken, body) {
    try {
      const userCognito = await cognitoService.cognitoAdminGetUserByAccessToken(accessToken);
      const cognitoUserEmail = getOrCheck(userCognito, "email");
      const cognitoMandaiId = getOrCheck(userCognito, "custom:mandai_id");
      const isMatchedInfo = this.userVerifyMatchedInfo(body, cognitoUserEmail, cognitoMandaiId);

      if (!isMatchedInfo) {
        return {
          membership: {
            code: 200,
            valid: false,
            expired_at: null,
          },
          status: "failed",
          statusCode: 200,
        };
      }

      // Verifier that expects valid access tokens:
      const verifier = CognitoJwtVerifier.create({
        userPoolId: process.env.USER_POOL_ID,
        tokenUse: "access",
        clientId: this.cognitoClientId,
      });
      const payload = await verifier.verify(accessToken);
      const exp = payload && payload.exp ? payload.exp : "";
      return {
        token: {
          code: 200,
          valid: !!payload && !!payload.username,
          expired_at: !!exp ? formatDateToMySQLDateTime(new Date(exp * 1000)) : null,
          [`${body.email && body.email.trim().length > 0 ? "email" : "mandaiId"}`]: body.email || body.mandaiId,
        },
        status: "success",
        statusCode: 200,
      };
    } catch (error) {
      loggerService.error(
        {
          userVerifyToken: {
            email: body.email,
            mandaiId: body.mandaiId || "",
            action: "verifyToken",
            layer: "userVerifyTokenService.verifyToken",
            error: new Error(error),
          },
        },
        {},
        "End Verify Token Service - Failed"
      );
      throw new Error(
        JSON.stringify({
          membership: {
            code: 200,
            valid: false,
            expired_at: null,
          },
          status: "failed",
          statusCode: 200,
        })
      );
    }
  }

  /**
   * Verify Matched User Information with Cognito
   * Can apply this method cause Cognito can not be empty in this time
   * @param {Object} body - email || mandaiId
   * @param {string} emailFromCognito - Email from Cognito
   * @param {string} mandaiIdFromCognito - MandaiId from Cognito
   * @returns {boolean} - Check is matched or not
   */
  userVerifyMatchedInfo(body, emailFromCognito, mandaiIdFromCognito) {
    const email = body.email ? body.email.trim().toLowerCase() : "";
    const mandaiId = body.mandaiId ? body.mandaiId.trim() : "";
    const cognitoEmail = emailFromCognito ? emailFromCognito.trim().toLowerCase() : "";

    if (body.email && body.mandaiId) {
      return cognitoEmail === email && mandaiId === mandaiIdFromCognito;
    }

    if (body.email) {
      return cognitoEmail === email;
    }

    if (body.mandaiId) {
      return mandaiId === mandaiIdFromCognito;
    }

    return false;
  }
}

module.exports = new UserVerifyTokenService();
