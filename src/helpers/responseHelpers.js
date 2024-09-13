 const loggerService = require('../logs/logger');
 const userConfig = require('../config/usersConfig');
 const commonService = require('../services/commonService');
/**
 *
 * @param {string} module 'user'
 * @param {string} moduleFunc 'usersServices.createUserService'
 * @param {string} configModulePrefix 'USERS_SIGNUP', name prefix for response config
 * @param {json} req 'the request obj'
 * @param {string} mwgCode 'MWG_CIAM_USER_SIGNUP_ERR'
 * @param {json} clientReqObj json obj or array use to request to client - Galaxy, Cognito, Passkit etc
 * @param {json} clientResObj json obj or array response from client - Galaxy, Cognito, Passkit etc
 * @returns
 */
function responseHandle(module='user', moduleFunc, configModulePrefix, req, mwgCode, clientReqObj='', clientResObj='') {
  const logObj = loggerService.build(module, moduleFunc, req, mwgCode, clientReqObj, clientResObj);

  return craftUsersApiResponse('', req.body, mwgCode, configModulePrefix, logObj);
}

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
  logObj['response_to_internal']= JSON.stringify(responseToInternal);
  loggerService.log(logObj);

  return responseToInternal;
}

/**
 * responseHelper.craftGetUserApiInternalRes('', req.body, 'success', response, logObj);
 *
 * @param {*} attr
 * @param {*} reqBody
 * @param {*} status
 * @param {*} response
 * @param {*} logObj
 * @returns
 */
function craftGetUserApiInternalRes(attr='', req, mwgCode, response, logObj){
  // step1: read env var for MEMBERSHIPS_API_RESPONSE_CONFIG
  let resConfigVar = JSON.parse(userConfig['GET_USER_MEMBERSHIPS_API_RESPONSE_CONFIG']);
  let resConfig = resConfigVar[mwgCode];

  // response JSON
  let responseStructure = {
    "membership": {
      "code": resConfig.code,
      "mwgCode": mwgCode,
      "message": resConfig.message
    },
    "status": resConfig.status,
    "statusCode": resConfig.code
  };

  let responseToInternal = responseStructure;

  // craft response JSON
  if(req.body.group = 'wildpass'){
    if(response !== ''){
      // let stringDBUser = JSON.stringify(response.db_user);
      if(response.db_user != undefined){
        // if db user not exist
        memberInfo = formatGetUserAPIResData(req, response.db_user, 'GET_USER_API_RESPONSE_MAPPING');
        responseToInternal = mergeJson(memberInfo, responseStructure);
      }else{
        // re-format cognito user attributes to key:value for next mapping process
        let cognitoUserJson = commonService.convertUserAttrToNormJson(response.cognitoUser.UserAttributes);
        cognitoUserJson['visualId'] = cognitoUserJson['custom:membership'];
        console.log("AAA", cognitoUserJson);
        memberInfo = formatGetUserAPIResData(req, cognitoUserJson, 'GET_USER_API_RESPONSE_MAPPING');
        responseToInternal = mergeJson(memberInfo, responseStructure);
      }
    }
  }

  // prepare logs
  logObj['response_to_internal']= JSON.stringify(responseToInternal);
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

function formatGetUserAPIResData(req, memberInfo, config){
  // set response data using mapping
  requester = commonService.extractStringPart(req.headers['mwg-app-id'], 0);
  group = req.body.group;
  configName = config+'_'+group.toUpperCase()+'_'+requester.toUpperCase();
  // map obj
  resObj = commonService.mapJsonObjects(userConfig[configName], memberInfo);
  // format DOB
  const date = new Date(resObj.dateOfBirth);
  resObj['dateOfBirth'] = date.toISOString().split('T')[0];

  return resObj;
}

function mergeJson(jsonA, jsonB) {
  // Merge jsonA fields into the nested 'membership' object in jsonB
  jsonB.membership = {
    ...jsonB.membership,
    ...jsonA
  };

  return jsonB;
}

module.exports = {
  craftUsersApiResponse,
  craftGetMemberShipInternalRes,
  craftGetUserApiInternalRes,
  formatMiddlewareRes
}