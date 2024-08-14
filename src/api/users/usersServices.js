/**
 * This service should use to process membership related only
 * Process response after getting the result from cognito
 */

const {
  CognitoIdentityProviderClient, AdminGetUserCommand, AdminCreateUserCommand, AdminUpdateUserAttributesCommand, AdminDeleteUserCommand,
  AdminConfirmSignUp, AdminInitiateAuthCommand, AdminResetUserPasswordCommand, ForgotPasswordCommand, AdminSetUserPasswordCommand
} = require("@aws-sdk/client-cognito-identity-provider");
const client = new CognitoIdentityProviderClient({ region: "ap-southeast-1" });

// use dotenv
require('dotenv').config();

const crypto = require("crypto");
const commonService = require('../../services/commonService');
const loggerService = require('../../logs/logger');
const responseHelper = require('../../helpers/responseHelpers');
const usersUpdateHelpers = require('./usersUpdateHelpers');
const lambdaService = require('../../services/lambdaService');
const passkitService = require('../../services/passkitService');
const usersSignupHelper = require('./usersSignupHelper');

/**
 * Function User signup service
 * @param {json} req
 * @returns
 */
async function userSignupService(req){
  // set the source base on app ID
  req['body']['source'] = commonService.setSource(req.headers);

  // generate Mandai ID
  req.body['mandaiID'] = usersSignupHelper.generateMandaiID(req.body);

  req.body['visualID'] = usersSignupHelper.generateVisualID(req.body);

  // prepare membership group
  req['body']['membershipGroup'] = commonService.prepareMembershipGroup(req.body);

  // TODO: create user's wildpass card face first.
  let genWPCardFace = prepareWPCardfaceInvoke(req);
  if(genWPCardFace.status === 'failed'){
    return genWPCardFace
  }
  // TODO: save users into DB

  // call cognitoCreateUser function
  return cognitoCreateUser(req);
}

/**
 * Cognito create user
 *
 * @param {json} req
 * @returns
 */
async function cognitoCreateUser(req){
  // prepare array  to create user
  const newUserArray = {
    UserPoolId: process.env.USER_POOL_ID,
    Username: req.body.email,
    TemporaryPassword: "Password123#",
    DesiredDeliveryMediums: ["EMAIL"],
    MessageAction: "SUPPRESS", // disable send verification email temp password
    UserAttributes: [
      {"Name": "email_verified", "Value": "true"},
      {"Name": "given_name"    , "Value": req.body.firstName},
      {"Name": "family_name"   , "Value": req.body.lastName},
      {"Name": "preferred_username", "Value": req.body.email},
      {"Name": "name"   , "Value": req.body.firstName +" "+req.body.lastName},
      {"Name": "email"         , "Value": req.body.email},
      {"Name": "birthdate"     , "Value": req.body.dob}, //TODO, convert birthdate to timestamp
      // custom fields
      {"Name": "custom:membership", "Value": JSON.stringify(req.body.membershipGroup)},
      {"Name": "custom:mandai_id", "Value": req.body.mandaiID},
      {"Name": "custom:newsletter", "Value": JSON.stringify(req.body.newsletter)},
      {"Name": "custom:terms_conditions", "Value": "null"},
      {"Name": "custom:visual_id", "Value": "null"},
      {"Name": "custom:vehicle_iu", "Value": "null"},
      {"Name": "custom:vehicle_plate", "Value": "null"},
      {"Name": "custom:last_login", "Value": "null"},
      {"Name": "custom:source", "Value": req.body.source}
    ],
  };

  var newUserParams = new AdminCreateUserCommand(newUserArray);

  try {
    // create user in Lambda
    var response = await client.send(newUserParams);

    // send welcome email
    let functionName = process.env.LAMBDA_CIAM_SIGNUP_TRIGGER_MAIL_FUNCTION;
    const emailTriggerData = {
      email: req.body.email,
      firstName: req.body.firstName,
      group: req.body.group,
      ID: req.body.mandaiID
    };

    // lambda invoke
    response['email_trigger'] = await lambdaService.lambdaInvokeFunction(emailTriggerData, functionName);

    // prepare logs
    let logObj = loggerService.build('user', 'usersServices.createUserService', req, 'MWG_CIAM_USER_SIGNUP_SUCCESS', newUserArray, response);
    // prepare response to client
    let responseToClient = responseHelper.craftUsersApiResponse('', req.body, 'MWG_CIAM_USER_SIGNUP_SUCCESS', 'USERS_SIGNUP', logObj);

    //TODO: import pass to GALAXY

    return responseToClient;

  } catch (error) {
    // prepare logs
    let logObj = loggerService.build('user', 'usersServices.createUserService', req, 'MWG_CIAM_USER_SIGNUP_ERR', newUserArray, error);
    // prepare response to client
    let responseErrorToClient = responseHelper.craftUsersApiResponse('', req.body, 'MWG_CIAM_USER_SIGNUP_ERR', 'USERS_SIGNUP', logObj);

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
  let name = usersUpdateHelpers.createNameParameter(req.body, userAttributes);
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

/**
 * Resend user membership preparation
 *
 * @param {json} req
 * @param {json} memberAttributes
 * @returns
 */
async function resendUserMembership(req, memberAttributes){

  // clean the request data for possible white space
  var reqBody = commonService.cleanData(req.body);

  // invokesend email lambda
  let functionName = process.env.LAMBDA_CIAM_SIGNUP_TRIGGER_MAIL_FUNCTION;

  // find user attribute value for mandaiID
  mandaiID = commonService.findUserAttributeValue(memberAttributes, 'custom:mandai_id');
  firstName = commonService.findUserAttributeValue(memberAttributes, 'given_name')

  // event data
  const event = {
    email: reqBody.email,
    firstName: firstName,
    group: reqBody.group,
    ID: mandaiID
  };

  try {
    // lambda invoke
    const response = await lambdaService.lambdaInvokeFunction(event, functionName);

    // prepare logs
    let logObj = loggerService.build('user', 'userServices.resendUserMembership', req, 'MWG_CIAM_RESEND_MEMBERSHIP_SUCCESS', event, response);
    // prepare response to client
    return responseHelper.craftUsersApiResponse('', req.body, 'MWG_CIAM_RESEND_MEMBERSHIP_SUCCESS', 'RESEND_MEMBERSHIP', logObj);

  } catch (error) {
   // prepare logs
   let logObj = loggerService.build('user', 'userServices.resendUserMembership', req, 'MWG_CIAM_RESEND_MEMBERSHIPS_ERR', event, error);
   // prepare response to client
   return responseHelper.craftUsersApiResponse('', req.body, 'MWG_CIAM_RESEND_MEMBERSHIPS_ERR', 'RESEND_MEMBERSHIP', logObj);
  }
}

/**
 * Generate WP cardface
 *
 * @param {json} req
 * @returns
 */
async function prepareWPCardfaceInvoke(req){
   // integrate with cardface lambda
   let functionName = process.env.LAMBDA_CIAM_SIGNUP_CREATE_WILDPASS_FUNCTION;

   let dob = commonService.convertDateHyphenFormat(req.body.dob);
   // event data
   const event = {
      name: req.body.lastName +' '+ req.body.firstName,
      dateOfBirth: dob,
      mandaiId: req.body.mandaiID
   };

   try {
    // lambda invoke
    const response = await lambdaService.lambdaInvokeFunction(event, functionName);
    if(response.statusCode === 200){
      return response;
    }
    if([400, 500].includes(response.statusCode) ){
      // prepare logs
      let logObj = loggerService.build('user', 'usersServices.prepareWPCardfaceInvoke', req, 'MWG_CIAM_USER_SIGNUP_ERR', event, response);
      // prepare response to client
      return responseHelper.craftUsersApiResponse('', req.body, 'MWG_CIAM_USER_SIGNUP_ERR', 'USERS_SIGNUP', logObj);
    }
  } catch (error) {


    return error
  }
}

/**
 * Delete membership
 *
 * @param {json} req
 * @returns
 */
async function deleteMembership(req){
  // prepare update user array
  const deleteUserArray = {
    UserPoolId: process.env.USER_POOL_ID,
    Username: req.body.email,
  }

  var setDeleteParams = new AdminDeleteUserCommand(deleteUserArray);

  try {
    var responseFromCognito = await client.send(setDeleteParams);

    // prepare logs
    let logObj = loggerService.build('user', 'usersServices.deleteMembership', req, 'MWG_CIAM_USER_DELETE_SUCCESS', deleteUserArray, responseFromCognito);
    // prepare response to client
    let responseToClient = responseHelper.craftUsersApiResponse('', req.body, 'MWG_CIAM_USER_DELETE_SUCCESS', 'DELETE_MEMBERSHIP', logObj);

    return responseToClient;

  } catch (error) {
    // prepare logs
    let logObj = loggerService.build('user', 'usersServices.deleteMembership', req, 'MWG_CIAM_USER_DELETE_ERR', deleteUserArray, error);
    // prepare response to client
    let responseErrorToClient = responseHelper.craftUsersApiResponse('', req.body, 'MWG_CIAM_USER_DELETE_ERR', 'DELETE_MEMBERSHIP', logObj);

    return responseErrorToClient;
  }
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
  userSignupService,
  adminUpdateUser,
  getUserMembership,
  resendUserMembership,
  deleteMembership,
  processError,
  genSecretHash,
  processErrors
};