// use dotenv
require('dotenv').config();
const appConfig = require('../config/appConfig');

/**
 * log function
 * usage loggerService.log('user', clientAPI, endpointReqObj, responseFromCognito, responseToClient);
 *
 * @param {strr} moduleName users/memberships
 * @param {JSON} clientAPI payload received from  caller/integrator
 * @param {JSON} req payload prepare to call external/AWS
 * @param {JSON} res payload response to caller
 */
function log(logObj, action=null){
  if(process.env.APP_LOG_SWITCH === 'true'){
    console.log(`${appConfig.LOG_APP_PREFIX} ` + action, logObj);
  }
}

/**
 * build log function
 *
 * @param {strr} moduleName users/memberships
 * @param {JSON} api payload received from integrator
 * @param {JSON} req payload prepare to call external/AWS
 * @param {JSON} res payload response from external/AWS
 */
function build(moduleName, action, req, mwgCode, endpointReqObj, responseFromEndpoint){
  const logObj = {
    [moduleName]: {
        "membership": (req.body.group == undefined) ? moduleName : req.body.group,
        "action": action,
        "api_header": req.headers,
        "api_body": req.body,
        "mwgCode": mwgCode
  },
    endoint_request_array: JSON.stringify(endpointReqObj)
  }

  logObj['endpoint_response'] = JSON.stringify(responseFromEndpoint);
  if (JSON.stringify(responseFromEndpoint) === '[]' || JSON.stringify(responseFromEndpoint) === '{}') {
    logObj['endpoint_response'] = responseFromEndpoint;
  }

  return logObj;
}

/**
 * Log error
 * @param {mix} logObj json or string message
 * @param {*} req request object
 */
function error (logObj, req={}, action=null) {
  if(process.env.APP_LOG_SWITCH === 'true'){
    let apiPath = (req.apiPath != undefined) ? 'path:'+req.apiPath : undefined;
    if (req.apiPath === undefined) {
      apiPath = '';
    }
    console.error(appConfig.LOG_APP_PREFIX + ' ' + action + ' '+ apiPath +' ', logObj);
  }
}

/** export the module */
module.exports = {
  log, build, error
};