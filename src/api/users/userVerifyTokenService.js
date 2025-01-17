require("dotenv").config();
const { formatDateToMySQLDateTime } = require("../../utils/dateUtils");
const cognitoService = require("../../services/cognitoService");
const { getOrCheck } = require("../../utils/cognitoAttributes");
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const MembershipErrors = require("../../config/https/errors/membershipErrors");

class UserVerifyTokenService {
  async verifyToken(accessToken, email, lang) {
    try {
      const userCognito = await cognitoService.cognitoAdminGetUserByAccessToken(
        accessToken
      );
      const cognitoUserEmail = getOrCheck(userCognito, "email");
      if (cognitoUserEmail !== email) {
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
          email: email,
        },
        status: "success",
        statusCode: 200,
      };
    } catch (error) {
      const errorMessage =
        error && error.message ? JSON.parse(error.message) : "";

      if (
        !!errorMessage &&
        errorMessage.rawError &&
        errorMessage.rawError.includes(
          "NotAuthorizedException: Access Token has expired"
        )
      ) {
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
      throw new Error(
        JSON.stringify(MembershipErrors.ciamMembershipEmailInvalid(lang))
      );
    }
  }
}

module.exports = new UserVerifyTokenService();
