const resHelper = require("../helpers/responseHelpers");
const EmailDomainService = require("../services/emailDomainsService");
const loggerService = require("../logs/logger");
const CommonErrors = require("../config/https/errors/common");
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const userCredentialModel = require("../db/models/userCredentialModel");
const cognitoService = require("../services/cognitoService");
const { GROUP } = require("../utils/constants");
const appConfig = require("../config/appConfig");
const switchService = require("../services/switchService");
const { maskKeyRandomly } = require("../utils/common");
const commonService = require("../services/commonService");
const { messageLang } = require("../utils/common");

/**
 * Validate empty request
 * @param {JSON} req
 * @param {JSON} res
 * @param {*} next
 * @returns
 */
function isEmptyRequest(req, res, next) {
  if (
    req.method === "POST" ||
    req.method === "PUT" ||
    req.method === "PATCH" ||
    req.method === "DELETE"
  ) {
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

  return await validateEmailDisposable(req, res, next);
}

async function validateEmailDisposable(req, res, next) {
  if (!req.body.email) {
    return next();
  }

  // Convert email to lowercase
  const normalizedEmail = req.body.email.trim().toLowerCase();

  // optional: You can add more robust email validation here
  if (!(await EmailDomainService.emailFormatTest(normalizedEmail))) {
    loggerService.error(`Invalid email format ${normalizedEmail}`, req.body);
    return resStatusFormatter(res, 400, "The email is invalid");
  }

  // if check domain switch turned on ( 1 )
  if ((await EmailDomainService.getCheckDomainSwitch()) === true) {
    // validate email domain to DB
    let validDomain = await EmailDomainService.validateEmailDomain(
      normalizedEmail
    );
    if (!validDomain) {
      return resStatusFormatterCustom(req, res, 400, "The email is invalid");
    }
  }

  // update the email in the request body with the normalized version
  req.body.email = normalizedEmail;

  next();
}

//only use it when combine with emptyRequest middleware
async function lowercaseTrimKeyValueString(req, res, next) {
  const keysAcceptedLower = ["passType"];
  const keysAcceptedTrim = ["mandaiId", "visualId", "firstName", "lastName"];
  const keysAcceptedTrimAndLower = ["email"];
  const keysRequest = Object.entries(req.body);
  req.body = keysRequest.reduce((rs, [key, value]) => {
    if (keysAcceptedLower.includes(key) && value && typeof value === "string") {
      rs[key] = value.toLowerCase();
      return rs;
    }
    if (keysAcceptedTrim.includes(key) && value && typeof value === "string") {
      rs[key] = value.trim();
      return rs;
    }
    if (
      keysAcceptedTrimAndLower.includes(key) &&
      value &&
      typeof value === "string"
    ) {
      rs[key] = value.toLowerCase().trim();
      return rs;
    }
    rs[key] = value;
    return rs;
  }, {});
  next();
}

function resStatusFormatter(res, status, msg) {
  return res.status(status).json(resHelper.formatMiddlewareRes(status, msg));
}

/**
 * Customized disposable email response for AEM
 * @param {json} req
 * @param {json} res
 * @param {string} status
 * @param {string} msg
 * @returns
 */
function resStatusFormatterCustom(req, res, status, msg) {
  let mwgCode=null
  // check if response from AEM
  const requestFromAEM = commonService.isRequestFromAEM(req.headers);
  // custom mwg code
  if (requestFromAEM) {
    // custom for user signup
    if(req.method.toLowerCase() === 'post' && req.originalUrl === '/v1/ciam/users'){
      let signupConfig = resHelper.responseConfigHelper('users_signup', 'MWG_CIAM_USER_SIGNUP_ERR');
      mwgCode = signupConfig.mwgCode;
      status = signupConfig.code;
      msg = messageLang('signup_error', req.body.language);
    }
  }
  return res.status(status).json(resHelper.formatMiddlewareRes(status, msg, mwgCode));
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

  if (!req.body || (!req.body.email && !req.body.mandaiId)) {
    return res
      .status(401)
      .json(CommonErrors.UnauthorizedException(req.body.language));
  }

  const userCredentials = await userCredentialModel.findByUserEmailOrMandaiId(
    req.body.email || "",
    req.body.mandaiId || ""
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

async function validateAPIKey(req, res, next) {
  const validationSwitch = await switchService.findByName("api_key_validation");
  const privateAppIdArr = JSON.parse(appConfig[`PRIVATE_APP_ID_${process.env.APP_ENV.toUpperCase()}`]);

  const mwgAppID = req.headers && req.headers["mwg-app-id"] ? req.headers["mwg-app-id"] : "";
  const apiKey = req.headers && req.headers["x-api-key"] ? req.headers["x-api-key"] : "";

  loggerService.log(
      {
        middleware: {
          layer: "middleware.validateAPIKey",
          validationSwitch: JSON.stringify(validationSwitch),
          mwgAppID: maskKeyRandomly(mwgAppID),
          expectedApiKey: maskKeyRandomly(process.env.NOPCOMMERCE_REQ_PRIVATE_API_KEY),
          incomingApiKey: maskKeyRandomly(apiKey)
        },
      },
      "[CIAM] Validate Api Key Middleware - Process"
  );
  if (!mwgAppID || !privateAppIdArr.includes(mwgAppID)) {
    return res.status(401).json(CommonErrors.UnauthorizedException(req.body.language));
  }
  if (validationSwitch.switch === 1) {
    if (apiKey && apiKey === process.env.NOPCOMMERCE_REQ_PRIVATE_API_KEY) {
      return next();
    }
  }
  if (validationSwitch.switch === 0) {
    return next();
  }

  return res.status(401).json(CommonErrors.UnauthorizedException(req.body.language));
}

module.exports = {
  isEmptyRequest,
  validateEmail,
  resStatusFormatter,
  AccessTokenAuthGuardByAppIdGroupFOSeries,
  AccessTokenAuthGuard,
  validateEmailDisposable,
  lowercaseTrimKeyValueString,
  validateAPIKey,
};
