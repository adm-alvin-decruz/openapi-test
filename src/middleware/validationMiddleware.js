const resHelper = require("../helpers/responseHelpers");
const EmailDomainService = require("../services/emailDomainsService");
const loggerService = require("../logs/logger");
const CommonErrors = require("../config/https/errors/common");
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const userCredentialModel = require("../db/models/userCredentialModel");
const cognitoService = require("../services/cognitoService");
const { GROUP } = require("../utils/constants");

/**
 * Validate empty request
 * @param {JSON} req
 * @param {JSON} res
 * @param {*} next
 * @returns
 */
function isEmptyRequest(req, res, next) {
  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    if (Object.keys(req.body).length === 0) {
      return resStatusFormatter(res, 400, "Request body is empty");
    }
  }
  next();
}

async function validateEmail(req, res, next) {
  const { email } = req.body;
  let msg = "The email is invalid";

  if (!email) {
    return resStatusFormatter(res, 400, msg);
  }

  // Convert email to lowercase
  const normalizedEmail = email.trim().toLowerCase();

  // optional: You can add more robust email validation here
  if (!(await EmailDomainService.emailFormatTest(normalizedEmail))) {
    loggerService.error(`Invalid email format ${normalizedEmail}`, req.body);
    return resStatusFormatter(res, 400, msg);
  }

  // if check domain switch turned on ( 1 )
  if ((await EmailDomainService.getCheckDomainSwitch()) === true) {
    // validate email domain to DB
    let validDomain = await EmailDomainService.validateEmailDomain(normalizedEmail);
    if (!validDomain) {
      return resStatusFormatter(res, 400, msg);
    }
  }

  // update the email in the request body with the normalized version
  req.body.email = normalizedEmail;

  next();
}

function resStatusFormatter(res, status, msg) {
  return res.status(status).json(resHelper.formatMiddlewareRes(status, msg));
}

async function refreshToken(credentialInfo) {
  try {
    const refreshTokenRs = await cognitoService.cognitoRefreshToken(
      credentialInfo.tokens.refreshToken,
      credentialInfo.tokens.userSubId
    );
    await userCredentialModel.updateByUserId(credentialInfo.user_id, {
      tokens: JSON.stringify({
        ...credentialInfo.tokens,
        accessToken: refreshTokenRs.AuthenticationResult.AccessToken,
        idToken: refreshTokenRs.AuthenticationResult.IdToken,
      }),
    });
    return refreshTokenRs.AuthenticationResult.AccessToken;
  } catch (error) {
    return undefined;
  }
}

async function AccessTokenAuthGuard(req, res, next) {
  if (!req.headers.authorization) {
    return res
      .status(401)
      .json(CommonErrors.UnauthorizedException(req.body.language));
  }

  if (!req.body || !req.body.email) {
    return res
      .status(401)
      .json(CommonErrors.UnauthorizedException(req.body.language));
  }
  const userCredentials = await userCredentialModel.findByUserEmail(
    req.body.email
  );

  if (
    !userCredentials ||
    !userCredentials.tokens ||
    !userCredentials.tokens.accessToken ||
    !userCredentials.tokens.refreshToken ||
    userCredentials.tokens.accessToken !== req.headers.authorization
  ) {
    return res
      .status(401)
      .json(CommonErrors.UnauthorizedException(req.body.language));
  }
  const verifierAccessToken = CognitoJwtVerifier.create({
    userPoolId: process.env.USER_POOL_ID,
    tokenUse: "access",
    clientId: process.env.USER_POOL_CLIENT_ID,
  });
  try {
    const payloadAccessToken = await verifierAccessToken.verify(
      req.headers.authorization
    );
    if (!payloadAccessToken || !payloadAccessToken.username) {
      return res
        .status(401)
        .json(CommonErrors.UnauthorizedException(req.body.language));
    }
  } catch (error) {
    if (error && error.message && error.message.includes("Token expired at")) {
      const newAccessToken = await refreshToken(userCredentials);
      if (newAccessToken) {
        res.newAccessToken = newAccessToken;
        return next();
      } else {
        return res
          .status(401)
          .json(CommonErrors.UnauthorizedException(req.body.language));
      }
    }

    loggerService.error(
      {
        body: req.body,
        error: `${error}`,
      },
      {},
      "AccessTokenAuthGuard Middleware Failed"
    );
    return res
      .status(401)
      .json(CommonErrors.UnauthorizedException(req.body.language));
  }

  next();
}

async function AccessTokenAuthGuardByAppIdGroupFOSeries(req, res, next) {
  const mwgAppID =
    req.headers && req.headers["mwg-app-id"] ? req.headers["mwg-app-id"] : "";
  if (mwgAppID.includes("aem") && req.body.group === GROUP.MEMBERSHIP_PASSES) {
    return await AccessTokenAuthGuard(req, res, next);
  }
  next();
}

module.exports = {
  isEmptyRequest,
  validateEmail,
  resStatusFormatter,
  AccessTokenAuthGuardByAppIdGroupFOSeries,
  AccessTokenAuthGuard,
};
