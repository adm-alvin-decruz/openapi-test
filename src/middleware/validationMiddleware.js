const resHelper = require("../helpers/responseHelpers");
const EmailDomainService = require("../services/emailDomainsService");
const loggerService = require("../logs/logger");
const CommonErrors = require("../config/https/errors/commonErrors");
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const userCredentialModel = require("../db/models/userCredentialModel");
const configsModel = require("../db/models/configsModel");
const cognitoService = require("../services/cognitoService");
const { GROUP } = require("../utils/constants");
const switchService = require("../services/switchService");
const { maskKeyRandomly } = require("../utils/common");
const commonService = require("../services/commonService");
const { messageLang } = require("../utils/common");
const { shouldIgnoreEmailDisposable } = require("../helpers/validationHelpers");
const emailSensitiveHelper = require("../helpers/emailSensitiveHelper");
const { getAppIdConfiguration } = require("../helpers/getAppIdConfigHelpers");
const MembershipErrors = require("../config/https/errors/membershipErrors");
const UpdateUserErrors = require("../config/https/errors/updateUserErrors");
const { query, validationResult } = require("express-validator");
const validator = require("validator");
const { jwtDecode } = require("jwt-decode");
const { getCiamSecrets } = require("../services/secretsService");

/**
 * Validate empty request
 * @param {JSON} req
 * @param {JSON} res
 * @param {*} next
 * @returns
 */
function isEmptyRequest(req, res, next) {
  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH" || req.method === "DELETE") {
    if (
      Object.keys(req.body).length === 0 ||
      (Object.keys(req.body).length === 1 && Object.keys(req.body)[0] === "language")
    ) {
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
  await emailSensitiveHelper.findEmailInCognito(email);
  //handle adhook for newEmail property - If newEmail is existed in request payload
  const newEmail = req.body.data && req.body.data.newEmail ? req.body.data.newEmail : "";
  if (newEmail) {
    req.body.data.newEmail = await emailSensitiveHelper.findEmailInCognito(newEmail);
  }
  return await validateEmailDisposable(req, res, next);
}

async function validateEmailDisposable(req, res, next) {
  if (!req.body.email) {
    return next();
  }

  // Convert email to lowercase
  const normalizedEmail = req.body.email.trim().toLowerCase();

  //ignore validate email disposable if existed
  const ignoreValidate = await shouldIgnoreEmailDisposable(normalizedEmail);
  if (ignoreValidate) {
    req.body.email = normalizedEmail;
    return next();
  }

  // optional: You can add more robust email validation here
  if (!(await EmailDomainService.emailFormatTest(normalizedEmail))) {
    loggerWrapper(
      "ValidateEmailDisposable - Failed",
      {
        email: req.body.email,
        error: "Invalid Email - Domain Service has blocked",
        layer: "validationMiddleware.validateEmailDisposable",
      },
      "error"
    );
    return resStatusFormatter(res, 400, "The email is invalid");
  }

  // if check domain switch turned on ( 1 )
  if ((await EmailDomainService.getCheckDomainSwitch()) === true) {
    // validate email domain to DB
    const validDomain = await EmailDomainService.validateEmailDomain(normalizedEmail);
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
  req.body = transformObject(req.body);
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
  let mwgCode = null;
  // check if response from AEM
  const requestFromAEM = commonService.isRequestFromAEM(req.headers);
  // custom mwg code
  if (requestFromAEM) {
    // custom for user signup
    if (req.method.toLowerCase() === "post" && req.originalUrl === "/v1/ciam/users") {
      let signupConfig = resHelper.responseConfigHelper("users_signup", "MWG_CIAM_USER_SIGNUP_ERR");
      mwgCode = signupConfig.mwgCode;
      status = signupConfig.code;
      msg = messageLang("email_is_invalid", req.body.language);
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
    return res.status(401).json(CommonErrors.UnauthorizedException(req.body.language));
  }

  if (!req.body || (!req.body.email && !req.body.mandaiId)) {
    return res.status(401).json(CommonErrors.UnauthorizedException(req.body.language));
  }

  const userCredentials = await userCredentialModel.findByUserEmailOrMandaiId(
    req.body.email || "",
    req.body.mandaiId || ""
  );

  if (!userCredentials) {
    loggerWrapper(
      "AccessTokenAuthGuard Middleware Failed",
      {
        email: req.body.email || "",
        mandaiId: req.body.mandaiId || "",
        error: "Account has no record!",
        layer: "validationMiddleware.AccessTokenAuthGuard",
      },
      "error"
    );
    return res.status(400).json(UpdateUserErrors.ciamEmailNotExists(req.body.language));
  }

  if (
    !userCredentials.tokens ||
    !userCredentials.tokens.accessToken ||
    !userCredentials.tokens.refreshToken ||
    userCredentials.tokens.accessToken !== req.headers.authorization
  ) {
    loggerWrapper(
      "AccessTokenAuthGuard Middleware Failed",
      {
        email: req.body.email || "",
        mandaiId: req.body.mandaiId || "",
        error: "Token Credentials Information can not found!",
        layer: "validationMiddleware.AccessTokenAuthGuard",
      },
      "error"
    );
    return res.status(401).json(CommonErrors.UnauthorizedException(req.body.language));
  }

  const ciamSecrets = getCiamSecrets();
  const verifierAccessToken = CognitoJwtVerifier.create({
    userPoolId: process.env.USER_POOL_ID,
    tokenUse: "access",
    clientId: ciamSecrets.USER_POOL_CLIENT_ID,
  });
  try {
    const payloadAccessToken = await verifierAccessToken.verify(req.headers.authorization);
    if (!payloadAccessToken || !payloadAccessToken.username) {
      return res.status(401).json(CommonErrors.UnauthorizedException(req.body.language));
    }
  } catch (error) {
    if (error && error.message && error.message.includes("Token expired at")) {
      const newAccessToken = await refreshToken(userCredentials);
      if (newAccessToken) {
        res.newAccessToken = newAccessToken;
        return next();
      } else {
        return res.status(401).json(CommonErrors.UnauthorizedException(req.body.language));
      }
    }

    loggerWrapper(
      "AccessTokenAuthGuard Middleware Failed",
      {
        email: req.body.email,
        error: new Error(error),
        layer: "validationMiddleware.AccessTokenAuthGuard",
      },
      "error"
    );
    return res.status(401).json(CommonErrors.UnauthorizedException(req.body.language));
  }
  next();
}

async function AccessTokenAuthGuardByAppIdGroupFOSeries(req, res, next) {
  const mwgAppID = req.headers && req.headers["mwg-app-id"] ? req.headers["mwg-app-id"] : "";
  if (mwgAppID.includes("aem") && req.body.group === GROUP.MEMBERSHIP_PASSES) {
    return await AccessTokenAuthGuard(req, res, next);
  }
  next();
}

async function validateAPIKey(req, res, next) {
  const validateAPIKeySwitch = await switchService.findByName("api_key_validation");
  const mwgAppID = req.headers && req.headers["mwg-app-id"] ? req.headers["mwg-app-id"] : "";
  const reqHeaderAPIKey = req.headers && req.headers["x-api-key"] ? req.headers["x-api-key"] : "";

  // log variables
  let action = "CIAM] Validate Api Key Middleware";
  let logObj = {
    layer: "middleware.validateAPIKey",
    validateAPIKeySwitch: JSON.stringify(validateAPIKeySwitch),
    mwgAppID: maskKeyRandomly(mwgAppID),
    incomingApiKey: maskKeyRandomly(reqHeaderAPIKey),
  };

  loggerWrapper(action + " - Process", logObj);

  try {
    // get App ID from db config table
    const dbConfigAppId = await configsModel.findByConfigKey("app_id", "app_id_key_binding");
    if (!dbConfigAppId || !dbConfigAppId.key) {
      logObj.appIdConfiguration = undefined;
      loggerWrapper(action + " - Process", logObj);
      return res.status(401).json(CommonErrors.UnauthorizedException(req.body.language));
    }

    logObj.appIdConfiguration = JSON.stringify(dbConfigAppId);
    loggerWrapper(action + " - Process", logObj);
    if (validateAPIKeySwitch.switch === 1) {
      logObj.error = "configuration app id not found!";
      if (!dbConfigAppId.value || !dbConfigAppId.value.length) {
        loggerWrapper(action + "  - Failed validation", logObj);
        return res.status(401).json(CommonErrors.UnauthorizedException(req.body.language));
      }

      const appIdConfigFromDB = getAppIdConfiguration(dbConfigAppId.value, mwgAppID);
      if (!appIdConfigFromDB) {
        loggerWrapper(action + "  - Failed validation", logObj);
        return res.status(401).json(CommonErrors.UnauthorizedException(req.body.language));
      }

      const apiKeyConfig = appIdConfigFromDB.lambda_api_key;
      const bindingCheck = appIdConfigFromDB.binding;
      const ciamSecrets = getCiamSecrets();
      const apiKeyEnv = ciamSecrets[`${apiKeyConfig}`];
      if (!bindingCheck) {
        loggerWrapper(action + " - Completed validation - binding is false", logObj);
        return next();
      }
      if (bindingCheck && apiKeyEnv && apiKeyEnv === reqHeaderAPIKey) {
        logObj.error = "";
        loggerWrapper(action + " - Completed validation - binding is true", logObj);
        return next();
      }
    }
    if (validateAPIKeySwitch.switch === 0) {
      return next();
    }

    loggerWrapper(action + " - Finished validation", logObj);

    return res.status(401).json(CommonErrors.UnauthorizedException(req.body.language));
  } catch (error) {
    logObj.error = new Error(error);
    loggerWrapper(action + " - Failed Exception", logObj);

    return res.status(401).json(CommonErrors.UnauthorizedException(req.body.language));
  }
}

/**
 * Transform request body based on keys identify.
 * @function
 * @param {Object} reqBodyObj - The user information associated with the original email.
 */
function transformObject(reqBodyObj) {
  const keysAcceptedLower = ["passType"];
  const keysAcceptedTrim = ["mandaiId", "visualId", "firstName", "lastName", "first_name", "last_name", "member"];
  const keysAcceptedTrimAndLower = ["email", "newEmail"];
  const transformArrayException = ["coMembers"];

  if (typeof reqBodyObj !== "object" || reqBodyObj === null) return reqBodyObj; // Skip non-objects

  return Object.entries(reqBodyObj).reduce((rs, [key, value]) => {
    if (keysAcceptedLower.includes(key) && value && typeof value === "string") {
      rs[key] = value.toLowerCase();
      return rs;
    }

    if (keysAcceptedTrim.includes(key) && value && typeof value === "string") {
      rs[key] = value.trim();
      return rs;
    }

    if (keysAcceptedTrimAndLower.includes(key) && value && typeof value === "string") {
      rs[key] = value.toLowerCase().trim();
      return rs;
    }

    if (transformArrayException.includes(key) && Array.isArray(value)) {
      rs[key] = value.map((ele) => {
        return transformObject(ele);
      });
      return rs;
    }

    if (typeof value === "object" && value !== null) {
      rs[key] = transformObject(value);
      return rs;
    }

    rs[key] = value;
    return rs;
  }, {});
}

function loggerWrapper(action, loggerObj, type = "logInfo") {
  if (type === "error") {
    return loggerService.error({ middlewareValidation: { ...loggerObj } }, {}, action);
  }

  return loggerService.log({ middlewareValidation: { ...loggerObj } }, action);
}

function validateQueryParameters(req, res, next) {
  const errors = [];
  const queryRaw = req.query;
  const page = queryRaw.page;
  const limit = queryRaw.limit;
  if (queryRaw) {
    const parts = queryRaw.query.split(",");

    if (parts.length > 0) {
      const [email, name, visualID, mandaiID] = parts;
      if (email && !validator.isEmail(email)) {
        errors.push({ msg: "Email is incorrect format!" });
      }

      if (name && !validator.isAlphanumeric(name)) {
        errors.push({ msg: "Name is incorrect format!" });
      }

      if (visualID && !validator.isNumber(name)) {
        errors.push({ msg: "visualID is incorrect format!" });
      }

      if (mandaiID && !validator.isAlphanumeric(mandaiID)) {
        errors.push({ msg: "MandaiId is incorrect format!" });
      }
    }
  }

  if (!!page && !validator.isInt(page, { min: 1 })) {
    errors.push({ msg: "page must be a positive integer" });
  }

  if (!!limit && !validator.isInt(limit, { min: 1, max: 100 })) {
    errors.push({ msg: "limit must be between 1 and 100" });
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
}

async function CookiesAuthGuard(req, res, next) {
  if (!req.headers || !req.headers["mwg-csp-auth-cookie"]) {
    return res.status(401).json(CommonErrors.UnauthorizedException(req.body.language));
  }

  const rawPath = req.route.path;
  const accessToken = req.headers["mwg-csp-auth-cookie"];
  const accessTokenDecode = jwtDecode(accessToken);
  const permissionConfig = await configsModel.findByConfigKey("siam_api_access_control", "path_permission");
  if (!permissionConfig || !permissionConfig.value) {
    return res.status(401).json(CommonErrors.UnauthorizedException(req.body.language));
  }
  //validate roles
  const entries = Object.entries(permissionConfig.value);
  let roles = null;
  for (const [pattern, data] of entries) {
    if (pattern === rawPath) {
      roles = data;
      break;
    }
  }
  if (!roles) {
    return res.status(401).json(CommonErrors.UnauthorizedException(req.body.language));
  }
  const permissionFromJWT =
    accessTokenDecode.permissions && accessTokenDecode.permissions.CSP && accessTokenDecode.permissions.CSP.CSP
      ? accessTokenDecode.permissions.CSP.CSP
      : null;
  if (!permissionFromJWT) {
    return res.status(401).json(CommonErrors.UnauthorizedException(req.body.language));
  }

  let allowed = false;
  for (const role of roles) {
    const permissions = permissionFromJWT[`${role.module}`] || null;
    if (permissions && permissions.indexOf(role.permission) >= 0) {
      allowed = true;
      break;
    }
  }
  if (!allowed) {
    return res.status(401).json(CommonErrors.UnauthorizedException(req.body.language));
  }
  next();
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
  validateQueryParameters,
  CookiesAuthGuard,
};
