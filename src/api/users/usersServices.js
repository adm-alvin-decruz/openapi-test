/**
 * This service should use to process membership related only
 * Process response after getting the result from cognito
 */

const {
  CognitoIdentityProviderClient, AdminGetUserCommand, AdminCreateUserCommand, AdminUpdateUserAttributesCommand, AdminDeleteUserCommand,
  AdminConfirmSignUp, AdminInitiateAuthCommand, AdminResetUserPasswordCommand, ForgotPasswordCommand, AdminSetUserPasswordCommand, AdminDisableUserCommand
} = require("@aws-sdk/client-cognito-identity-provider");
const client = new CognitoIdentityProviderClient({ region: "ap-southeast-1" });
const passwordService = require('../users/userPasswordService');

// use dotenv
require('dotenv').config();
const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);


const crypto = require("crypto");
const commonService = require('../../services/commonService');
const loggerService = require('../../logs/logger');
const responseHelper = require('../../helpers/responseHelpers');
const usersUpdateHelpers = require('./usersUpdateHelpers');
const lambdaService = require('../../services/lambdaService');
const cognitoService = require('../../services/cognitoService');
const usersSignupHelper = require('./usersSignupHelper');
const userConfig = require('../../config/usersConfig');
const emailService = require('./usersEmailService');
const userDBService = require('./usersDBService');
const userUpdateHelper = require('./usersUpdateHelpers');
const userDeleteHelper = require('./usersDeleteHelpers');
const galaxyWPService = require('../components/galaxy/services/galaxyWPService');

/**
 * Function User signup service
 * @param {json} req
 * @returns
 */
async function userSignup(req){
  // set the source base on app ID
  req['body']['source'] = commonService.setSource(req.headers);

  // generate Mandai ID
  let mandaiID = usersSignupHelper.generateMandaiID(req.body);
  if(mandaiID.error){
    return mandaiID;
  }
  req.body['mandaiID'] = mandaiID;

  /** Diable Galaxy import pass for Phase1A, move to queue later*/
  // import pass to Galaxy
  // const galaxyImportPass = await retryOperation(async () => {
  //   return await galaxyWPService.callMembershipPassApi(req);
  // });
  // return error when galaxy failed.
  // if(!galaxyImportPass.visualId || galaxyImportPass.visualId === 'undefined'){
  //   return responseHelper.responseHandle('user', 'usersServices.createUserService', 'USERS_SIGNUP', req, 'MWG_CIAM_USER_SIGNUP_ERR', req.body, galaxyImportPass);
  // }
  // req.body['galaxy'] = JSON.stringify(galaxyImportPass);
  // req.body['visualID'] = galaxyImportPass.visualId;
  // NOTE: disable galaxy import pass for now
  // req.body['visualID'] = '';
  /** disable galaxy import pass end */

  // prepare membership group
  req['body']['membershipGroup'] = commonService.prepareMembershipGroup(req.body);

  // create user's wildpass card face first.
  const genWPCardFace = await retryOperation(async () => {
    return await prepareWPCardfaceInvoke(req);
  });
  req['body']['log'] = JSON.stringify({"cardface": genWPCardFace});

  // let genPasskit = await prepareGenPasskitInvoke(req);

  if(genWPCardFace.status === 'failed'){
    return genWPCardFace
  }

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
  req['apiTimer'] = req.processTimer.apiRequestTimer();
  req.apiTimer.log('usersServices.cognitoCreateUser start'); // log process time
  // prepare array  to create user
  const newUserArray = {
    UserPoolId: process.env.USER_POOL_ID,
    Username: req.body.email,
    TemporaryPassword: passwordService.generatePassword(8),
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

    let response = {};
    // create user in Lambda
    const cognitoResponse = await retryOperation(async () => {
      const cognitoRes =  await client.send(newUserParams);
      if (cognitoRes.$metadata.httpStatusCode !== 200) {
        return 'Lambda user creation failed';
      }
      req.apiTimer.end('Cognito Create User ended');
      return cognitoRes;
    });

    // save to DB
    req.body.password = await passwordService.hashPassword(newUserArray.TemporaryPassword);
    const dbResponse = await retryOperation(async () => {
      return await usersSignupHelper.createUserSignupDB(req);
    });

    // send welcome email
    const emailResponse = await retryOperation(async () => {
      return await emailService.lambdaSendEmail(req);
    });

    response = {
      cognito: cognitoResponse,
      db: JSON.stringify(dbResponse),
      email_trigger: emailResponse
    };

    // prepare logs
    newUserArray.TemporaryPassword = ''; // fix clear-text logging of sensitive information
    let logObj = loggerService.build('user', 'usersServices.createUserService', req, 'MWG_CIAM_USER_SIGNUP_SUCCESS', newUserArray, response);
    // prepare response to client
    let responseToClient = responseHelper.craftUsersApiResponse('', req.body, 'MWG_CIAM_USER_SIGNUP_SUCCESS', 'USERS_SIGNUP', logObj);

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
  req['apiTimer'] = req['processTimer'].apiRequestTimer();
  req.apiTimer.log('usersServices.getUserMembership starts'); // log process time
  let getMemberJson = {
    UserPoolId: process.env.USER_POOL_ID,
    Username: req.body.email
  };

  const getUserCommand = new AdminGetUserCommand(getMemberJson);
  var response = {};
  try {
    // get from cognito
    response['cognitoUser'] = await client.send(getUserCommand);
    // read from database
    response['db_user'] = await userDBService.getDBUserByEmail(req.body);

    // prepare logs
    let logObj = loggerService.build('user', 'usersServices.getUserMembership', req, '', getMemberJson, response);
    // prepare response to client
    let responseToInternal = responseHelper.craftGetMemberShipInternalRes('', req.body, 'success', response, logObj);

    req.apiTimer.end('usersServices.getUserMembership'); // log end time
    return responseToInternal;

  } catch (error) {
    if(error.name === 'UserNotFoundException'){
      var result = {"status": "not found", "data": error};
    }else{
      var result = {"status": "failed", "data": error};
    }
    req.apiTimer.end('usersServices.getUserMembership error'); // log end time
  }

  let logObj = loggerService.build('user', 'usersServices.getUserMembership', req, '', getMemberJson, result);
  loggerService.log(logObj);

  return result;
}

/**
 * Update user CIAM info
 */
async function adminUpdateUser (req, ciamComparedParams, membershipData, prepareDBUpdateData){
  req['apiTimer'] = req.processTimer.apiRequestTimer();
  req.apiTimer.log('usersServices:adminUpdateUser start'); // log process time
  // add name params to cognito request, make sure update value if there's changes otherwise no change.
  let name = usersUpdateHelpers.createNameParameter(req.body, membershipData.cognitoUser.UserAttributes);
  ciamComparedParams.push(name);

  const response = [];

  // get mandai ID
  req.body['mandaiID'] = membershipData.db_user.mandai_id;

  try {
    // create user's wildpass card face first.
    let genWPCardFace = await prepareWPCardfaceInvoke(req);
    response['cardface'] = JSON.stringify({"cardface": genWPCardFace});

    // save to cognito
    response['cognito'] = await cognitoService.cognitoAdminUpdateUser(req, ciamComparedParams)

    // save to DB
    response['updateDb'] = await userUpdateHelper.updateDBUserInfo(req, prepareDBUpdateData, membershipData.db_user);

    /** Diable Galaxy import pass for Phase1A, move to queue later */
    // galaxy update
    // response['galaxyUpdate'] = await userUpdateHelper.updateGalaxyPass(req, ciamComparedParams, membershipData);
    /**disable galaxy import pass end */

    // send update email
    req.body['emailType'] = 'update_wp';
    response['email_trigger'] = await emailService.lambdaSendEmail(req);

    // prepare logs
    let updateUserArr = [response.cognito.cognitoUpdateArr, prepareDBUpdateData]
    let logObj = loggerService.build('user', 'usersServices.adminUpdateUser', req, 'MWG_CIAM_USER_UPDATE_SUCCESS', updateUserArr, response);
    // prepare response to client
    let responseToClient = responseHelper.craftUsersApiResponse('', req.body, 'MWG_CIAM_USER_UPDATE_SUCCESS', 'USERS_UPDATE', logObj);

    req.apiTimer.end('adminUpdateUser'); // log end time
    return responseToClient;

  } catch (error) {
    // prepare logs
    let logObj = loggerService.build('user', 'usersServices.adminUpdateUser', req, 'MWG_CIAM_USER_UPDATE_ERR', response, error);
    // prepare response to client
    let responseErrorToClient = responseHelper.craftUsersApiResponse('', req.body, 'MWG_CIAM_USER_UPDATE_ERR', 'USERS_UPDATE', logObj);

    req.apiTimer.end('adminUpdateUser error'); // log end time
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
  const validationVar = JSON.parse(userConfig['SIGNUP_VALIDATE_PARAMS']);

  if(attr === 'email' && mwgCode === 'MWG_CIAM_USER_SIGNUP_ERR'){
    // replace string
    let msg = validationVar[attr].exist;
    msg = msg.replace('%s', reqBody.group);
    return {[attr]: msg};
  }
}

function processErrors(attr, reqBody, mwgCode){
  const validationVar = JSON.parse(userConfig['SIGNUP_VALIDATE_PARAMS']);

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
  reqBody['mandaiID'] = commonService.findUserAttributeValue(memberAttributes, 'custom:mandai_id');
  reqBody['firstName'] = commonService.findUserAttributeValue(memberAttributes, 'given_name')

  try {
    // resend wildpass email
    reqBody['emailType'] = 'update_wp'; // use wildpass re-send template
    const response  = await emailService.lambdaSendEmail(req);

    // prepare logs
    let logObj = loggerService.build('user', 'userServices.resendUserMembership', req, 'MWG_CIAM_RESEND_MEMBERSHIP_SUCCESS', memberAttributes, response);
    // prepare response to client
    return responseHelper.craftUsersApiResponse('', req.body, 'MWG_CIAM_RESEND_MEMBERSHIP_SUCCESS', 'RESEND_MEMBERSHIP', logObj);

  } catch (error) {
   // prepare logs
   let logObj = loggerService.build('user', 'userServices.resendUserMembership', req, 'MWG_CIAM_RESEND_MEMBERSHIPS_ERR', memberAttributes, error);
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
  req['apiTimer'] = req.processTimer.apiRequestTimer();
  req.apiTimer.log('usersServices.prepareWPCardfaceInvoke start'); // log process time
   // integrate with cardface lambda
   let functionName = process.env.LAMBDA_CIAM_SIGNUP_CREATE_WILDPASS_FUNCTION;

   let dob = commonService.convertDateHyphenFormat(req.body.dob);
   // event data
   const event = {
      name: req.body.firstName +' '+ req.body.lastName,
      dateOfBirth: dob,
      mandaiId: req.body.mandaiID
   };

   try {
      // lambda invoke
      const response = await lambdaService.lambdaInvokeFunction(event, functionName);
      req.apiTimer.end('usersServices.prepareWPCardfaceInvoke'); // log end time

      if(response.statusCode === 200){
        return response;
      }
      if([400, 500].includes(response.statusCode) || response.errorType === 'Error'){
        // prepare logs
        let logObj = loggerService.build('user', 'usersServices.prepareWPCardfaceInvoke', req, 'MWG_CIAM_USER_SIGNUP_ERR', event, response);
        // prepare response to client
        return responseHelper.craftUsersApiResponse('', req.body, 'MWG_CIAM_USER_SIGNUP_ERR', 'USERS_SIGNUP', logObj);
      }
    } catch (error) {
      error = new Error(`lambda invoke error: ${error}`);
      req.apiTimer.end('usersServices.prepareWPCardfaceInvoke error'); // log end time
      // prepare logs
      let logObj = loggerService.build('user', 'usersServices.prepareWPCardfaceInvoke', req, 'MWG_CIAM_USER_SIGNUP_ERR', event, error);
      // prepare log response
      return responseHelper.craftUsersApiResponse('', req.body, 'MWG_CIAM_USER_SIGNUP_ERR', 'USERS_SIGNUP', logObj);
  }
}

/**
 * Delete membership
 *
 * @param {json} req
 * @returns
 */
async function deleteMembership(req, membershipData){
  req['apiTimer'] = req.processTimer.apiRequestTimer();
  req.apiTimer.log('usersServices.deleteMembership start'); // log process time
  // prepare update user array
  const deleteUserArray = {
    UserPoolId: process.env.USER_POOL_ID,
    Username: req.body.email,
  }

  const response = [];
  try {

    if(['dev', 'uat'].includes(process.env.APP_ENV) ){
      var setDeleteParams = new AdminDeleteUserCommand(deleteUserArray);
      // delete in DB
      if(JSON.stringify(membershipData.db_user) != undefined){
        response['delete_user_db'] = await userDeleteHelper.deleteDBUserInfo(membershipData.db_user);
      }
    }

    if(['prod'].includes(process.env.APP_ENV) ){
      var setDeleteParams = new AdminDisableUserCommand(deleteUserArray);
      // disable in DB
      if(JSON.stringify(membershipData.db_user) != undefined){
        response['disable_user_db'] = await userDeleteHelper.disableDBUser(membershipData.db_user);
      }
    }

    // delete/disable from cognito
    response['delete_user_cognito'] = await client.send(setDeleteParams);

    // prepare logs
    let logObj = loggerService.build('user', 'usersServices.deleteMembership', req, 'MWG_CIAM_USER_DELETE_SUCCESS', deleteUserArray, response);
    // prepare response to client
    let responseToClient = responseHelper.craftUsersApiResponse('', req.body, 'MWG_CIAM_USER_DELETE_SUCCESS', 'DELETE_MEMBERSHIP', logObj);

    req.apiTimer.end('usersServices.deleteMembership'); // log end time
    return responseToClient;

  } catch (error) {
    // prepare logs
    let logObj = loggerService.build('user', 'usersServices.deleteMembership', req, 'MWG_CIAM_USER_DELETE_ERR', deleteUserArray, error);
    // prepare response to client
    let responseErrorToClient = responseHelper.craftUsersApiResponse('', req.body, 'MWG_CIAM_USER_DELETE_ERR', 'DELETE_MEMBERSHIP', logObj);

    req.apiTimer.end('usersServices.deleteMembership Error'); // log end time
    return responseErrorToClient;
  }
}

async function getUserCustomisable(req){
  let getMemberJson = {
    UserPoolId: process.env.USER_POOL_ID,
    Username: req.body.email
  };

  const getUserCommand = new AdminGetUserCommand(getMemberJson);
  var response = {};
  try {
    // get from cognito
    response['cognitoUser'] = await client.send(getUserCommand);
    // read from database
    if(req.body.group = 'wildpass'){
      response['db_user'] = await userDBService.queryWPUserByEmail(req.body);
    }else{
      response['db_user'] = await userDBService.getDBUserByEmail(req.body);
    }

    // prepare logs
    let logObj = loggerService.build('user', 'usersServices.getUserMembershipCustom', req, '', getMemberJson, response);
    // prepare response to client
    let responseToInternal = responseHelper.craftGetUserApiInternalRes('', req, 'MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS', response, logObj);
    return responseToInternal;

  } catch (error) {
    if(error.name === 'UserNotFoundException'){
      // prepare logs
      let logObj = loggerService.build('user', 'usersServices.getUserMembershipCustom', req, '', getMemberJson, error);
      // prepare response to client
      let responseToInternal = responseHelper.craftGetUserApiInternalRes('', req, 'MWG_CIAM_USERS_MEMBERSHIPS_NULL', '', logObj);
      return responseToInternal;
    }else{
      // prepare logs
      let logObj = loggerService.build('user', 'usersServices.getUserMembershipCustom', req, '', getMemberJson, error);
      // prepare response to client
      let responseToInternal = responseHelper.craftGetUserApiInternalRes('', req, 'MWG_CIAM_USERS_MEMBERSHIPS_GET_ERROR', '', logObj);
      return responseToInternal;
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

async function prepareGenPasskitInvoke(req){
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
     // prepare logs
     let logObj = loggerService.build('user', 'usersServices.prepareWPCardfaceInvoke', req, 'MWG_CIAM_USER_SIGNUP_ERR', event, error);
     // prepare log response
     responseHelper.craftUsersApiResponse('', req.body, 'MWG_CIAM_USER_SIGNUP_ERR', 'USERS_SIGNUP', logObj);

   return error
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

/**************************/
/** Reference code ended **/
/**************************/

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

async function retryOperation(operation, maxRetries = 9, delay = 200) {
  let lastError = [];
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError[`Attempt ${attempt + 1} `] = `Attempt ${attempt + 1} failed: ` + error.message;
      // console.error(`Attempt ${attempt + 1} failed:`, error.message);
      await setTimeoutPromise(delay);
    }
  }
  // return new Error(`Operation failed after ${maxRetries} attempts. Last error: ${JSON.stringify(lastError)}`);
  return lastError
}

/** export the module */
module.exports = {
  userSignup,
  adminUpdateUser,
  getUserMembership,
  resendUserMembership,
  deleteMembership,
  getUserCustomisable,
  processError,
  genSecretHash,
  processErrors
};