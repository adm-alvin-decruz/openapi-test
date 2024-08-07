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
const commonService = require('../../services/commonService');
const loggerService = require('../../logs/logger');
const responseHelper = require('../../helpers/responseHelpers');
const usersUpdateHelpers = require('./usersUpdateHelpers');

async function createUserService(req){
  // clean the request data for possible white space
  var reqBody = commonService.cleanData(req.body);

  // prepare membership group
  let membershipGroup = commonService.prepareMembershipGroup(reqBody);

  // generate Mandai ID
  let mandaiId = commonService.generateMandaiId(reqBody);

  // set the source base on app ID
  let source = commonService.setSource(req.headers);

  // prepare array  to create user
  const newUserArray = {
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
  };

  var newUserParams = new AdminCreateUserCommand(newUserArray);

  try {
    var response = await client.send(newUserParams);

    // prepare logs
    let logObj = loggerService.build('user', 'usersServices.createUserService', req, 'MWG_CIAM_USER_SIGNUP_SUCCESS', newUserArray, response);

    // prepare response to client
    let responseToClient = responseHelper.craftUsersApiResponse('', reqBody, 'MWG_CIAM_USER_SIGNUP_SUCCESS', 'USERS_SIGNUP', logObj);

    return responseToClient;

  } catch (error) {
    // prepare logs
    let logObj = loggerService.build('user', 'usersServices.createUserService', req, 'MWG_CIAM_USER_SIGNUP_ERR', newUserArray, error);

    // prepare response to client
    let responseErrorToClient = responseHelper.craftUsersApiResponse('', reqBody, 'MWG_CIAM_USER_SIGNUP_ERR', 'USERS_SIGNUP', logObj);

    return responseErrorToClient;
  }
}

/**
 *
 * @param {JSON} req request payload
 * @returns
 */
async function getUserMembership(req){
  let getMemberJson = {
    UserPoolId: process.env.USER_POOL_ID,
    Username: req.body.email
  };

  const getUserCommand = new AdminGetUserCommand(getMemberJson);

  try {
    var response = await client.send(getUserCommand);
    // var result = {"status": "success", "data": response};

    // prepare logs
    let logObj = loggerService.build('user', 'usersServices.getUserMembership', req, '', getMemberJson, response);
    // prepare response to client
    let responseToInternal = responseHelper.craftGetMemberShipInternalRes('', req.body, 'success', response, logObj);
    console.log(responseToInternal);
    return responseToInternal;

  } catch (error) {
    if(error.name === 'UserNotFoundException'){
      var result = {"status": "not found", "data": error};
    }else{
      var result = {"status": "failed", "data": error};
    }
  }

  // prepare logs
  const clientAPIData = {
    "membership": req.body.group,
    "action": "getUserMembership Service",
    "api_header": req.headers,
    "api_body": req.body,
    "mwgCode": ""
  }
  loggerService.log('user', clientAPIData, getUserCommand, response, result);

  return result;
}

/**
 * Update user CIAM info
 */
async function adminUpdateUser (req, listedParams, userAttributes){
  // clean the request data for possible white space
  var reqBody = commonService.cleanData(req.body);

  // add name params to cognito request, make sure update value if there's changes otherwise no change.
  // let firstName = (reqBody.firstName === undefined) ? ''
  let name = usersUpdateHelpers.createNameParameter(listedParams, userAttributes);
  listedParams.push(name);

  // prepare update user array
  const updateUserArray = {
    UserPoolId: process.env.USER_POOL_ID,
    Username: reqBody.email,
    UserAttributes: listedParams
  }

  var setUpdateParams = new AdminUpdateUserAttributesCommand(updateUserArray);

  try {
    var responseFromCognito = await client.send(setUpdateParams);

    // prepare logs
    let logObj = loggerService.build('user', 'usersServices.adminUpdateUser', req, 'MWG_CIAM_USER_UPDATE_SUCCESS', updateUserArray, responseFromCognito);

    // prepare response to client
    let responseToClient = responseHelper.craftUsersApiResponse('', reqBody, 'MWG_CIAM_USER_UPDATE_SUCCESS', 'USERS_UPDATE', logObj);

    return responseToClient;

  } catch (error) {
    // prepare logs
    let logObj = loggerService.build('user', 'usersServices.adminUpdateUser', req, 'MWG_CIAM_USER_SIGNUP_ERR', updateUserArray, error);

    // prepare response to client
    let responseErrorToClient = responseHelper.craftUsersApiResponse('', reqBody, 'MWG_CIAM_USER_SIGNUP_ERR', 'USERS_UPDATE', logObj);

    return responseErrorToClient;
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
    return responseHelper.craftUsersApiResponse(attr, reqBody, 'MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS', 'USERS_SIGNUP');
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
  processError,
  genSecretHash,
  processErrors
};