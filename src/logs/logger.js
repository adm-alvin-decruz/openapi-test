// use dotenv
require('dotenv').config();

/**
 * log function
 * usage loggerService.log('user', clientAPI, endpointReqObj, responseFromCognito, responseToClient);
 *
 * @param {strr} moduleName users/memberships
 * @param {JSON} clientAPI payload received from  caller/integrator
 * @param {JSON} req payload prepare to call external/AWS
 * @param {JSON} res payload response to caller
 */
function log(logObj){
  if(process.env.APP_LOG_SWITCH === 'true'){
    console.log(logObj);
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
    endoint_request_array: JSON.stringify(endpointReqObj),
    endpoint_response: JSON.stringify(responseFromEndpoint),
  }

  return logObj;
}

/** export the module */
module.exports = {
  log, build
};