// use dotenv
require('dotenv').config()

const {
  CognitoIdentityProviderClient, ListUsersCommand, AdminGetUserCommand, AdminInitiateAuthCommand, AdminResetUserPasswordCommand,
  ForgotPasswordCommand, AdminSetUserPasswordCommand, AdminCreateUserCommand, AdminUpdateUserAttributesCommand
} = require("@aws-sdk/client-cognito-identity-provider");
const client = new CognitoIdentityProviderClient({ region: "ap-southeast-1" });

const membershipsService = require('./membershipsServices');
const AEMService = require('../../services/AEMService');

/**
 * Function listAll users
 *
 * @returns array all users in userspool
 */
async function listAll(){
  const command = new ListUsersCommand({
    UserPoolId: process.env.USER_POOL_ID,
  });

  try {
    var response = await client.send(command);
  } catch (error) {
    if(process.env.APP_LOG_SWITCH){
      console.log(error);
    }
  }
  return response;
}

/**
 * Function get user by email using AdminGetUserCommand
 * After that using the response and req body to process membership
 *
 * @returns JSON user
 */
async function adminGetUser(reqBody){
  // validate request params
  if(validationParams(reqBody) === 'error'){
    let paramsError = membershipsService.processResponse('', reqBody, 'MWG_CIAM_PARAMS_ERR');
    if(process.env.APP_LOG_SWITCH){
      console.log(paramsError);
    }
    return paramsError;
  }

  const command = new AdminGetUserCommand({
    UserPoolId: process.env.USER_POOL_ID,
    Username: reqBody.email
  });

  let response = '';
  try {
    response = await client.send(command);
    response = await membershipsService.processResponse(response, reqBody, 'MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS');
  } catch (error) {
    if(process.env.APP_LOG_SWITCH === 'true'){
      console.error(error);
    }
    if(error.name === 'UserNotFoundException'){
      // check to AEM checkemail for group = wildpass
      response = await checkEmailInAem(reqBody);
    }else{
      response = await membershipsService.processResponse('', reqBody, 'MWG_CIAM_USERS_MEMBERSHIPS_EMAIL_ERR');
    }
  }

  if(!response['source']){
    response['source'] = 'ciam';
  }

  if(process.env.APP_LOG_SWITCH === 'true'){
    console.log(response);
  }
  return response;
}

/**
 * Function validating request parameters
 *
 * @param {JSON} reqBody
 * @returns string
 */
function validationParams(reqBody){

  if(Object.keys(reqBody).length > 2){
    if(process.env.APP_LOG_SWITCH){
      console.log('Too many parameters.');
    }
    return "error";
  }
  if(typeof reqBody.email == 'undefined'){
    if(process.env.APP_LOG_SWITCH){
      console.log('email param not exist.');
    }
    return "error";
  }
  if(typeof reqBody.group == 'undefined'){
    if(process.env.APP_LOG_SWITCH){
      console.log('group param not exist.');
    }

    return "error";
  }
}

async function checkEmailInAem(reqBody){
  // check route if true
  if(process.env.AEM_WILDPASS_EMAILCHECK_ROUTE === 'true' && reqBody.group === 'wildpass'){
    var aemResponse = await AEMService.aemCheckWildPassByEmail(reqBody);
    var noMembership = aemResponse.data.valid;

    let response = '';
    if(noMembership === 'true'){
      // means email has no membership in aem
      response = await membershipsService.processResponse('aem', reqBody, 'MWG_CIAM_USERS_MEMBERSHIPS_NULL');
    }else {
      // has membership in aem and success
      response = await membershipsService.processResponse('aem', reqBody, 'MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS');
    }
    if(process.env.APP_LOG_SWITCH === 'true'){
      response['source'] = 'aem';
      console.log(aemResponse);
      // NOTE: don't log response here because caller function (adminGetUser) is logged
    }
  }
  return response
}

/**
 * Create user using admin function
 *
 * User flow step 1 signup
 * User created and with  password
 */
async function adminCreateUser (){
  var setPasswordParams = new AdminCreateUserCommand({
    UserPoolId: process.env.USER_POOL_ID,
    Username: "kwanoun.liong@mandai.com",
    TemporaryPassword: "Password123",
    DesiredDeliveryMediums: ["EMAIL"],
    UserAttributes: [
      {
        Name: "email_verified",
        Value: "true"
      },
      {
        Name: "given_name",
        Value: "kwanoun"
      },
      {
        Name: "family_name",
        Value: "Liong"
      },
      {
        Name: "email",
        Value: "kwanoun.liong@mandai.com"
      },
      {
        Name: "phone_number",
        Value: "+6599889998"
      }
   ],
  });

  try {
    var response = await client.send(setPasswordParams);
    return response;
  } catch (error) {
    console.log(error);
    return error;
  }
}

/**
 * User flow step 2 after signup
 * User created and in "force change password" status
 * Send Admin set user password
 */
async function adminSetUserPassword (){
  var setPasswordParams = new AdminSetUserPasswordCommand({
    UserPoolId: process.env.USER_POOL_ID,
    Username: "kwanoun.liong@mandai.com",
    Password: "Password123",
    Permanent: true
  });

  try {
    var response = await client.send(setPasswordParams);
    console.log(response);
  } catch (error) {
    console.log(error);
  }
}

async function userLogin (){
  var userSigninParams = new AdminInitiateAuthCommand({
    AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
    UserPoolId: process.env.USER_POOL_ID,
    ClientId: process.env.CLIENT_ID,
    AuthParameters: {
      USERNAME: "kwanoun.liong@mandai.com",
      PASSWORD: "Password123"
    }
  });

  try {
    var response = await client.send(userSigninParams);
  } catch (error) {
    response = error;
  }
  return response;
}

async function userResetPassword (){
  var resetPasswordParams = new AdminResetUserPasswordCommand({
    UserPoolId: process.env.USER_POOL_ID,
    Username: "kwanoun.liong@mandai.com"
  });

  try {
    var response = await client.send(resetPasswordParams);
    console.log(response);
  } catch (error) {
    console.log(error);
  }
}

async function userForgotPassword (){
  var forgotPasswordParams = new ForgotPasswordCommand({
    UserPoolId: process.env.USER_POOL_ID,
    Username: "kwanoun.liong@mandai.com"
  });

  try {
    var response = await client.send(forgotPasswordParams);
    console.log(response);
  } catch (error) {
    console.log(error);
  }
}

module.exports = {
  listAll,
  adminGetUser,
  adminCreateUser,
  adminSetUserPassword,
  userLogin,
  userResetPassword,
  userForgotPassword
};

