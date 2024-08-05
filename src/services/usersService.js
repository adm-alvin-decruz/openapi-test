/**
 * This service should use to process membership related only
 * Process response after getting the result from cognito
 */

const {
  CognitoIdentityProviderClient, AdminGetUserCommand, AdminInitiateAuthCommand, AdminResetUserPasswordCommand,
  ForgotPasswordCommand, AdminSetUserPasswordCommand, AdminCreateUserCommand, AdminUpdateUserAttributesCommand
} = require("@aws-sdk/client-cognito-identity-provider");
const client = new CognitoIdentityProviderClient({ region: "ap-southeast-1" });

// use dotenv
require('dotenv').config();

const crypto = require("crypto");
const commonService = require('../services/commonService');
const loggerService = require('../logs/logger');

async function createUserService(req){
  // clean the request data for possible white space
  var reqBody = commonService.cleanData(req.body);

  // prepare membership group
  let membershipGroup = commonService.prepareMembershipGroup(reqBody);

  // generate Mandai ID
  let mandaiId = commonService.generateMandaiId(reqBody);

  // set the source base on app ID
  let source = commonService.setSource(req.headers);

  var newUserParams = new AdminCreateUserCommand({
    UserPoolId: process.env.USER_POOL_ID,
    Username: reqBody.email,
    TemporaryPassword: "Password123#",
    DesiredDeliveryMediums: ["EMAIL"],
    UserAttributes: [
      {"Name": "email_verified", "Value": "true"},
      {"Name": "given_name"    , "Value": reqBody.firstName},
      {"Name": "family_name"   , "Value": reqBody.lastName},
      {"Name": "preferred_username", "Value": reqBody.email},
      {"Name": "name"   , "Value": reqBody.firstName +" "+reqBody.lastName},
      {"Name": "email"         , "Value": reqBody.email},
      {"Name": "birthdate"     , "Value": reqBody.dob}, //TODO, convert birthdate to timestamp
      // custom fields
      {"Name": "custom:membership", "Value": JSON.stringify(membershipGroup)},
      {"Name": "custom:mandai_id", "Value": mandaiId},
      {"Name": "custom:newsletter", "Value": JSON.stringify(reqBody.newsletter)},
      {"Name": "custom:terms_conditions", "Value": "null"},
      {"Name": "custom:visual_id", "Value": "null"},
      {"Name": "custom:vehicle_iu", "Value": "null"},
      {"Name": "custom:vehicle_plate", "Value": "null"},
      {"Name": "custom:last_login", "Value": "null"},
      {"Name": "custom:source", "Value": source}
    ],
  });

  try {
    var response = await client.send(newUserParams);
    // prepare logs
    const callerAPI = {
      "membership": reqBody.group,
      "api_header": req.headers,
      "api_body": reqBody,
      "mwgCode": "MWG_CIAM_USER_SIGNUP_SUCCESS"
    }
    loggerService.log('user', callerAPI, newUserParams, response);
    return processResponse('', reqBody, 'MWG_CIAM_USER_SIGNUP_SUCCESS');
  } catch (error) {
    // prepare logs
    const callerAPI = {
      "membership": reqBody.group,
      "api_header": req.headers,
      "api_body": reqBody,
      "mwgCode": "MWG_CIAM_USER_SIGNUP_ERR"
    }
    loggerService.log('user', callerAPI, newUserParams, error);
    return processResponse('', reqBody, 'MWG_CIAM_USER_SIGNUP_ERR');
  }
}

/**
 *
 * @param {JSON} req request payload
 * @returns
 */
async function getUserMembership(req){
  const getUserCommand = new AdminGetUserCommand({
    UserPoolId: process.env.USER_POOL_ID,
    Username: req.body.email
  });

  var result = {};
  try {
    var response = await client.send(getUserCommand);
    var result = {"status": "success", "data": response};
  } catch (error) {
    if(error.name === 'UserNotFoundException'){
      var result = {"status": "not found", "data": error};
    }else{
      var result = {"status": "failed", "data": error};
    }
  }

  // prepare logs
  const callerAPI = {
    "membership": req.body.group,
    "api_header": req.headers,
    "api_body": req.body,
    "mwgCode": "MWG_CIAM_USER_SIGNUP_ERR"
  }
  loggerService.log('user', callerAPI, getUserCommand, result);

  return result;
}

/**
 * Update user CIAM info
 */
async function adminUpdateUser (req, listedParams){
  // clean the request data for possible white space
  var reqBody = commonService.cleanData(req.body);

  // add name to listedParams
  // {"Name": "name"   , "Value": reqBody.firstName +" "+reqBody.lastName},
  listedParams['Name'] = "name";

  var setUpdateParams = new AdminUpdateUserAttributesCommand({
    UserPoolId: process.env.USER_POOL_ID,
    Username: reqBody.email,
    UserAttributes: [
      listedParams,
   ],
  });

  try {
    var response = await client.send(setUpdateParams);
    return response;
  } catch (error) {
    console.log(error);
    return error;
  }
}

/**
 * Generate login secret hash
 *
 * @param {string} username
 * @param {string} clientId
 * @param {string} clientSecret
 * @returns
 */
function genSecretHash(username, clientId, clientSecret) {
  return crypto
    .createHmac("sha256", clientSecret)
    .update(`${username}${clientId}`)
    .digest("base64");
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
function processResponse(attr='', reqBody, mwgCode){
  // step1: read env var for MEMBERSHIPS_API_RESPONSE_CONFIG
  var resConfigVar = JSON.parse(process.env.USERS_SIGNUP_API_RESPONSE_CONFIG);
  var resConfig = resConfigVar[mwgCode];

  // step3: craft response JSON
  let responsePayload = {
        "membership": {
          "code": resConfig.code,
          "mwgCode": mwgCode,
          "message": resConfig.message
        },
        "status": resConfig.status,
        "statusCode": resConfig.code
  };

  if(mwgCode === 'MWG_CIAM_USER_SIGNUP_ERR'){
    // add error params
    responsePayload['error'] = reqBody;
  }

  // prepare logs
  const callerAPI = {
    "membership": reqBody.group,
    "api_body": reqBody,
    "mwgCode": "MWG_CIAM_USER_SIGNUP_ERR"
  }
  loggerService.log('user', callerAPI, {}, responsePayload);

  return responsePayload;
}

/**
 * Process error for use in response
 *
 * @param {string} attr
 * @param {json} reqBody
 * @param {string} mwgCode
 * @returns
 */
function processError(attr='', reqBody, mwgCode){
  const valVarName = 'SIGNUP_VALIDATE_PARAMS';
  const validationVar = JSON.parse(process.env[valVarName]);

  if(attr === 'email' && mwgCode === 'MWG_CIAM_USER_SIGNUP_ERR'){
    // replace string
    let msg = validationVar[attr].exist;
    msg = msg.replace('%s', reqBody.group);
    return {[attr]: msg};
  }
}

function processErrors(attr, reqBody, mwgCode){
  const valVarName = 'SIGNUP_VALIDATE_PARAMS';
  const validationVar = JSON.parse(process.env[valVarName]);

  let errors = {};
  if(commonService.isJsonNotEmpty(attr) && mwgCode === 'MWG_CIAM_USER_SIGNUP_ERR'){
    if(commonService.isJsonNotEmpty(attr.invalid)){
      Object.keys(attr.invalid).forEach(function(key) {
        let msg = validationVar[attr.invalid[key]].invalid;
        msg = msg.replace('%s', attr.invalid[key]);
        errors[attr.invalid[key]]= msg;
      })
    }
    if(commonService.isJsonNotEmpty(attr.dob)){
      Object.keys(attr.dob).forEach(function(key) {
        errors['dob']= validationVar['dob'].range_error;
      })
    }
    if(commonService.isJsonNotEmpty(attr.newsletter)){
      Object.keys(attr.newsletter).forEach(function(key) {
        errors['newletter']= validationVar['newsletter'].subscribe_error;
      })
    }
  }
  return errors;
}

// ***************************************************************
// ********
// below codes for reference only, can remove once done dev
// ********
// ***************************************************************

/**
 * Function to process membership data
 *
 * @param {JSON} data
 * @param {JSON} reqBody
 * @returns
 */
function processMembership(data, reqBody){
  var attr = data.UserAttributes;
  member = loopAttr(attr, 'email', reqBody.email);
  if(member !== false){
    return processResponse(attr, reqBody, 'MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS');
  }
}

/**
 * Function process group
 *
 * @param {json} attr array of user's attribute from cognito
 * @param {json} reqBody request body
 * @returns json group object
 */
function processGroup(attr, reqBody){
  var reqGroupName = reqBody.group;
  grpAttr = loopAttr(attr, 'custom:group', '');

  // parse JSON
  if(grpAttr != false){
    grpJson = JSON.parse(grpAttr.Value);
    var grpObj = loopAttr(grpJson, reqGroupName, 'expiry');
    if(grpObj != false){
      return {[grpObj.name]: true};
    }
  }

  return {[reqGroupName]: false}
}

/**
 * Function loop attribute to find the desire name or value
 *
 * @param {json} attr array of user's attribute from cognito or
 * @param {string} name name of attribute to be found
 * @param {*} value value of attribute to be found
 * @returns json object
 */
function loopAttr(attr, name, value=''){
  var attrObj = false;
  attr.forEach(function(attribute) {
    if(attribute.Name === name || attribute.name === name){
      if(value != '' || attribute.Value === value){
      // attr found, return
      attrObj = attribute;
      } else {
        attrObj = attribute;
      }
    }
  });
  return attrObj;
}

function processAemGroup(reqBody, exist){
  // AEM only has wildpass
  return {["wildpass"]: exist}
}

function isJSONObject(obj) {
  return Array.isArray(obj);
}

/** export the module */
module.exports = {
  createUserService,
  adminUpdateUser,
  getUserMembership,
  processResponse,
  processError,
  genSecretHash,
  processErrors
};