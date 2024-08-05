// use dotenv
require('dotenv').config()

const {
  CognitoIdentityProviderClient, AdminInitiateAuthCommand, AdminResetUserPasswordCommand,
  ForgotPasswordCommand, AdminSetUserPasswordCommand, AdminUpdateUserAttributesCommand
} = require("@aws-sdk/client-cognito-identity-provider");
const client = new CognitoIdentityProviderClient({ region: "ap-southeast-1" });

const usersService = require('../services/usersService');
const validationService = require('../services/validationService');

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
 * Create user using admin function
 *
 * User flow step 1 signup
 * User created and with  password
 */
async function adminCreateUser (req){
  // API validation
  let errorParams = validationService.validateParams(req.body);

  // return errorParams;
  if(errorParams.status === 'success'){
    // continue
    try {
      // check if user exist
      var memberExist = await usersService.getUserMembership(req);

      if(memberExist.status === 'success'){
        // response "member exist" error.... TODO: move below process two lines and below below same two lines into a func
        let errorConfig = usersService.processError('email', req.body, 'MWG_CIAM_USER_SIGNUP_ERR');
        let response = usersService.processResponse('email', errorConfig, 'MWG_CIAM_USER_SIGNUP_ERR');
        return response;
      }else{
        var response = await usersService.createUserService(req);
      }

      return response;
    } catch (error) {
      console.log(error);
      return error;
    }
  }
  // prepare error params response
  errorConfig = usersService.processErrors(errorParams, req.body, 'MWG_CIAM_USER_SIGNUP_ERR');
  response = usersService.processResponse(errorParams, errorConfig, 'MWG_CIAM_USER_SIGNUP_ERR');
  return response;
}

/**
 * TODO: Move to user service
 *
 * @returns
 */
async function adminUpdateUser (req, listedParams){

  // validate if email param exist.
  // if(listedParams.email === undefined){
  //   return res.status(400).send({ error: 'Bad Request' });
  // }

  try {
    // check if user exist
    var memberExist = await usersService.getUserMembership(req);

    if(memberExist.status === 'success'){
      // user exist, can update info
      var response = await usersService.adminUpdateUser(req, listedParams);
      return response;
    }else{
      // TODO: reponse error user not exist
    }

    return response;
  } catch (error) {
    console.log(error);
    return error;
  }
}

/**
 * User flow step 2 after signup
 * TODO: Move to user service
 *
 * User created and in "force change password" status
 * Send Admin set user password
 */
async function adminSetUserPassword (){
  var setPasswordParams = new AdminSetUserPasswordCommand({
    UserPoolId: process.env.USER_POOL_ID,
    Username: "vinki",
    Password: "Password123##",
    Permanent: true
  });

  try {
    var response = await client.send(setPasswordParams);
    console.log(response);
  } catch (error) {
    console.log(error);
  }
}
/**
 * TODO: Move to user service
 *
 * @returns
 */
async function userLogin (){
  // hash secret
  let hashSecret = usersService.genSecretHash("kwanoun.liong@mandai.com", process.env.USER_POOL_CLIENT_ID, process.env.USER_POOL_CLIENT_SECRET);

  var userSigninParams = new AdminInitiateAuthCommand({
    AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
    UserPoolId: process.env.USER_POOL_ID,
    ClientId: process.env.USER_POOL_CLIENT_ID,
    AuthParameters: {
      SECRET_HASH: hashSecret,
      USERNAME: "kwanoun.liong@mandai.com",
      PASSWORD: "Password123##"
    }
  });

  try {
    var response = await client.send(userSigninParams);
  } catch (error) {
    console.log(error);
    response = error;
  }
  return response;
}

/**
 * TODO: Move to user service
 *
 */
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

/**
 * TODO: Move to user service
 *
 */
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
  adminCreateUser,
  adminUpdateUser,
  adminSetUserPassword,
  userLogin,
  userResetPassword,
  userForgotPassword
};

