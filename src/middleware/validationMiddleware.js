const resHelper = require("../helpers/responseHelpers");
const EmailDomainService = require("../services/emailDomainsService");
const loggerService = require("../logs/logger");
const CommonErrors = require("../config/https/errors/common");
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const userCredentialModel = require("../db/models/userCredentialModel");
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

  // optional: You can add more robust email validation here
  if (!(await EmailDomainService.emailFormatTest(email))) {
    loggerService.error(`Invalid email format ${email}`, req.body);
    return resStatusFormatter(res, 400, msg);
  }

  // if check domain switch turned on ( 1 )
  if ((await EmailDomainService.getCheckDomainSwitch()) === true) {
    // validate email domain to DB
    let validDomain = await EmailDomainService.validateEmailDomain(email);
    if (!validDomain) {
      return resStatusFormatter(res, 400, msg);
    }
  }

  next();
}

function resStatusFormatter(res, status, msg) {
  return res.status(status).json(resHelper.formatMiddlewareRes(status, msg));
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
    !userCredentials.tokens.idToken
  ) {
    return res
      .status(401)
      .json(CommonErrors.UnauthorizedException(req.body.language));
  }
  const verifier = CognitoJwtVerifier.create({
    userPoolId: process.env.USER_POOL_ID,
    tokenUse: "id",
    clientId: process.env.USER_POOL_CLIENT_ID,
  });
  const verifierAccessToken = CognitoJwtVerifier.create({
    userPoolId: process.env.USER_POOL_ID,
    tokenUse: "access",
    clientId: process.env.USER_POOL_CLIENT_ID,
  });
  try {
    const payload = await verifier.verify(userCredentials.tokens.idToken);
    const payloadAccessToken = await verifierAccessToken.verify(
      req.headers.authorization
    );
    if (payload.email !== req.body.email) {
      return res
        .status(401)
        .json(CommonErrors.UnauthorizedException(req.body.language));
    }
    if (!payloadAccessToken || !payloadAccessToken.username) {
      return res
        .status(401)
        .json(CommonErrors.UnauthorizedException(req.body.language));
    }
  } catch (error) {
    loggerService.error(new Error(
      `ValidationMiddleware.AccessTokenAuthGuard Error - payload: ${error}:`,
      req.body
    ));
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
