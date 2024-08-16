 const loggerService = require('../logs/logger');
 const userConfig = require('../config/usersConfig');

/**
 * Function process CIAM response
 *
 * @param {JSON} attr attribute section of the cognito response
 * @param {JSON} reqBody request body
 * @param {string} status status text success | failed
 * @param {int} statusCode status code 200 | 400 | 501
 * @returns
 */
function craftUsersApiResponse(attr='', reqBody, mwgCode, module, logObj){
  // step1: read env var for MEMBERSHIPS_API_RESPONSE_CONFIG
  let resConfigVar = JSON.parse(userConfig[module+'_API_RESPONSE_CONFIG']);
  let resConfig = resConfigVar[mwgCode];

  // step3: craft response JSON
  let responseToClient = {
        "membership": {
          "code": resConfig.code,
          "mwgCode": mwgCode,
          "message": resConfig.message
        },
        "status": resConfig.status,
        "statusCode": resConfig.code
  };

  if(mwgCode === 'MWG_CIAM_PARAMS_ERR'){
    // add error params
    responseToClient['membership']['error'] = reqBody;
  }

  // prepare logs
  logObj['response_to_client'] = responseToClient;
  loggerService.log(logObj);

  return responseToClient;
}

/**
 * responseHelper.craftGetMemberShipInternalRes('', req.body, 'success', response, logObj);
 *
 * @param {*} attr
 * @param {*} reqBody
 * @param {*} status
 * @param {*} response
 * @param {*} logObj
 * @returns
 */
function craftGetMemberShipInternalRes(attr='', reqBody, status, response, logObj){
  // craft response JSON
  let responseToInternal = {"status": status, "data": response};

  // prepare logs
  logObj['response_to_internal']= responseToInternal;
  loggerService.log(logObj);

  return responseToInternal;
}

/**
 * Function format middleware response
 *
 * @param {string} status
 * @param {string} msg
 * @returns
 */
function formatMiddlewareRes(status, msg){
  return {
    "membership": {
      "code": status,
      "mwgCode": 'MWG_CIAM_PARAMS_ERR',
      "message": msg
    },
    "status": 'failed',
    "statusCode": status
}
}

module.exports = {
  craftUsersApiResponse,
  formatMiddlewareRes,
  craftGetMemberShipInternalRes
}