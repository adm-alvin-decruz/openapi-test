const resHelper = require('../helpers/responseHelpers');
const EmailDomainService = require('../services/emailDomainsService');
const loggerService = require('../logs/logger');
const CommonErrors = require("../config/https/errors/common");

/**
 * Validate empty request
 * @param {JSON} req
 * @param {JSON} res
 * @param {*} next
 * @returns
 */
function isEmptyRequest(req, res, next) {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    if (Object.keys(req.body).length === 0) {
      return resStatusFormatter (res, 400, 'Request body is empty');
    }
  }
  next();
}

async function validateEmail(req, res, next) {
    const { email } = req.body;
    let msg = 'The email is invalid';

    if (!email) {
      return resStatusFormatter (res, 400, msg);
    }

    // optional: You can add more robust email validation here
    if (!await EmailDomainService.emailFormatTest(email)) {
      loggerService.error(`Invalid email format ${email}`, req);
      return resStatusFormatter (res, 400, msg);
    }

    // if check domain switch turned on ( 1 )
    if(await EmailDomainService.getCheckDomainSwitch() === true){
       // validate email domain to DB
      let validDomain = await EmailDomainService.validateEmailDomain(email);
      if (!validDomain) {
        return resStatusFormatter (res, 400, msg);
      }
    }

    next();
}

function resStatusFormatter (res, status, msg) {
  return res.status(status).json(
    resHelper.formatMiddlewareRes(status, msg)
  );
}

async function isEmptyAccessToken(req, res, next) {
  if (!req.headers.authorization) {
      return res.status(401).json(CommonErrors.UnauthorizedException(req.body.language));
  }
  next();
}

async function isEmptyAccessTokenBaseAppId(req, res, next) {
  const mwgAppID = req.headers && req.headers['mwg-app-id'] ? req.headers['mwg-app-id'] : '';
  if (mwgAppID.includes('aem') && !req.headers.authorization) {
    return res.status(401).json(CommonErrors.UnauthorizedException(req.body.language));
  }
  next();
}

module.exports = {
  isEmptyRequest,
  validateEmail,
  resStatusFormatter,
  isEmptyAccessToken,
  isEmptyAccessTokenBaseAppId
};
