require("dotenv").config();
const { formatDateToMySQLDateTime } = require("../../utils/dateUtils");
const cognitoService = require("../../services/cognitoService");
const { getOrCheck } = require("../../utils/cognitoAttributes");
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const loggerService = require("../../logs/logger");

class UserVerifyTokenService {
  async verifyToken(accessToken, body) {
    try {
      const userCognito = await cognitoService.cognitoAdminGetUserByAccessToken(
        accessToken
      );
      const cognitoUserEmail = getOrCheck(userCognito, "email");
      const cognitoMandaiId = getOrCheck(userCognito, "custom:mandai_id");
      if (
        body.email &&
        body.mandaiId &&
        body.email.trim().length > 0 &&
        body.mandaiId.trim().length > 0 &&
        (cognitoUserEmail !== body.email || cognitoMandaiId !== body.mandaiId)
      ) {
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
      if (!body.email && !body.mandaiId) {
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
      if (
        body.email &&
        body.email.trim().length > 0 &&
        cognitoUserEmail !== body.email
      ) {
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
      if (
        body.mandaiId &&
        body.mandaiId.trim().length > 0 &&
        cognitoMandaiId !== body.mandaiId
      ) {
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
        clientId: process.env.USER_POOL_CLIENT_ID,
      });
      const payload = await verifier.verify(accessToken);
      const exp = payload && payload.exp ? payload.exp : "";
      return {
        token: {
          code: 200,
          valid: !!payload && !!payload.username,
          expired_at: !!exp
            ? formatDateToMySQLDateTime(new Date(exp * 1000))
            : null,
          [`${
            body.email && body.email.trim().length > 0 ? "email" : "mandaiId"
          }`]: body.email || body.mandaiId,
        },
        status: "success",
        statusCode: 200,
      };
    } catch (error) {
      loggerService.error(`Error UserVerifyTokenService.verifyToken Error: ${error}`, body);
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
}

module.exports = new UserVerifyTokenService();
