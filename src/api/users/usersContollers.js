// use dotenv
require('dotenv').config()

const {
  CognitoIdentityProviderClient, AdminInitiateAuthCommand, AdminResetUserPasswordCommand,
  ForgotPasswordCommand, AdminSetUserPasswordCommand, AdminUpdateUserAttributesCommand
} = require("@aws-sdk/client-cognito-identity-provider");
const client = new CognitoIdentityProviderClient({ region: "ap-southeast-1" });

const usersService = require('./usersServices');
const validationService = require('../../services/validationService');
const commonService = require('../../services/commonService');
const loggerService = require('../../logs/logger');
const responseHelper = require('../../helpers/responseHelpers');
const aemService = require('../../services/AEMService');
const dbService = require('./usersDBService');

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
  // clean the request data for possible white space
  req['body'] = commonService.cleanData(req.body);

  // API validation
  let validatedParams = validationService.validateParams(req.body, 'SIGNUP_VALIDATE_PARAMS');

  // return errorParams;
  if(validatedParams.status === 'success'){
    // continue
    try {
      // check if user exist
      var memberExist = await usersService.getUserMembership(req);

      if(memberExist.status === 'success'){
        // response "member exist" error.... TODO: move below process two lines and below below same two lines into a func
        let errorConfig = usersService.processError('user', req.body, 'MWG_CIAM_USER_SIGNUP_ERR');
        // let response = responseHelper.craftUsersApiResponse('email', errorConfig, 'MWG_CIAM_USER_SIGNUP_ERR', 'USERS_SIGNUP');

        // prepare logs
        let logObj = loggerService.build('user', 'usersControllers.adminCreateUser', req, 'MWG_CIAM_USER_SIGNUP_ERR', {}, memberExist);
        // prepare error params response
        return responseHelper.craftUsersApiResponse('usersControllers.adminCreateUser', errorConfig, 'MWG_CIAM_USER_SIGNUP_ERR', 'USERS_SIGNUP', logObj);

      }else{
        var response = await usersService.userSignup(req);
      }

      return response;
    } catch (error) {
      console.log(error);
      return error;
    }
  }

    // prepare error params response
    errorConfig = usersService.processErrors(validatedParams, req.body, 'MWG_CIAM_USER_SIGNUP_ERR');
    // prepare logs
    let logObj = loggerService.build('user', 'usersControllers.adminCreateUser', req, 'MWG_CIAM_PARAMS_ERR', {}, errorConfig);
    // prepare error params response
    return responseHelper.craftUsersApiResponse('usersControllers.adminCreateUser', errorConfig, 'MWG_CIAM_PARAMS_ERR', 'USERS_SIGNUP', logObj);
}

/**
 * TODO: Move to user service
 *
 * @returns
 */
async function adminUpdateUser (req, listedParams){

  try {
    // check if user exist
    var memberInfo = await usersService.getUserMembership(req);

    // compare input data vs membership info
    let ciamComparedParams = commonService.compareAndFilterJSON(listedParams, memberInfo.data.cognitoUser.UserAttributes);
    let prepareDBUpdateData = dbService.prepareDBUpdateData(ciamComparedParams);

    if(commonService.isJsonNotEmpty(ciamComparedParams) === true){
      if(memberInfo.status === 'success'){
        // user exist, can update info
        var response = await usersService.adminUpdateUser(req, ciamComparedParams, memberInfo.data, prepareDBUpdateData);
        return response;
      }
    }

    // prepare logs
    let logObj = loggerService.build('user', 'usersControllers.adminUpdateUser', req, 'MWG_CIAM_USER_UPDATE_SUCCESS', {"success":"no data to update"}, memberInfo);

    // prepare error params response
    return responseHelper.craftUsersApiResponse('usersControllers.adminUpdateUser', req.body, 'MWG_CIAM_USER_UPDATE_SUCCESS', 'USERS_UPDATE', logObj);
    // return handleUserSignupError('user', 'usersControllers.adminUpdateUser', req, 'MWG_CIAM_USER_UPDATE_SUCCESS', 'USERS_UPDATE', {}, memberInfo)

  } catch (error) {
    return error;
  }
}

/**
 * Resend membership
 *
 * @param {json} req
 * @returns
 */
async function membershipResend(req){
  // API validation
  let validatedParams = validationService.validateParams(req.body, 'RESEND_VALIDATE_PARAMS');

  // if params no error, status success
  if(validatedParams.status === 'success'){
    // check if user exist
    var memberInfo = await usersService.getUserMembership(req);

    if(memberInfo.status === 'success'){
      // user exist, resend membership
      var response = await usersService.resendUserMembership(req, memberInfo.data.cognitoUser.UserAttributes);
      return response;
    }
    else if(memberInfo.status === 'not found'){
      // need to check to AEM and resend from there
      let response = await aemService.aemResendWildpass(req.body);

      if(response.code === 200){
        // prepare response resend success
        let logObj = loggerService.build('user', 'usersControllers.membershipResend', req, 'MWG_CIAM_RESEND_MEMBERSHIP_SUCCESS', {}, response);
        // prepare error params response
        return responseHelper.craftUsersApiResponse('usersControllers.membershipResend', response, 'MWG_CIAM_RESEND_MEMBERSHIP_SUCCESS', 'RESEND_MEMBERSHIP', logObj);
      }
    }
    // Prepare response membership not found
    let logObj = loggerService.build('user', 'usersControllers.membershipResend', req, 'MWG_CIAM_USERS_MEMBERSHIP_NULL', {}, memberInfo);
    // prepare error params response
    return responseHelper.craftUsersApiResponse('usersControllers.membershipResend', memberInfo, 'MWG_CIAM_USERS_MEMBERSHIP_NULL', 'RESEND_MEMBERSHIP', logObj);
  }

  // prepare error params response
  errorConfig = usersService.processErrors(validatedParams, req.body, 'MWG_CIAM_PARAMS_ERR');
  // prepare logs
  let logObj = loggerService.build('user', 'usersControllers.membershipResend', req, 'MWG_CIAM_PARAMS_ERR', {}, errorConfig);
  // prepare error params response
  return responseHelper.craftUsersApiResponse('usersControllers.membershipResend', errorConfig, 'MWG_CIAM_PARAMS_ERR', 'RESEND_MEMBERSHIP', logObj);
}

/**
 * Delete cognito membership
 *
 * @param {json} req
 * @returns
 */
async function membershipDelete(req){
  // check if user exist
  var memberInfo = await usersService.getUserMembership(req);

  if(memberInfo.status === 'success'){
    // user exist, can update info
    var response = await usersService.deleteMembership(req, memberInfo.data);
    return response;
  }
  let logObj = loggerService.build('user', 'usersControllers.membershipResend', req, 'MWG_CIAM_USERS_MEMBERSHIP_NULL', {}, {});
  // prepare error params response
  return responseHelper.craftUsersApiResponse('usersControllers.membershipResend', {}, 'MWG_CIAM_USERS_MEMBERSHIP_NULL', 'RESEND_MEMBERSHIP', logObj);
}

/**
 * Function get membership
 */
async function getUser(req){
  // clean the request data for possible white space
  req['body'] = commonService.cleanData(req.body);

  // API validation
  let validatedParams = validationService.validateParams(req.body, 'GET_USER_VALIDATE_PARAMS');

  // return errorParams;
  if(validatedParams.status === 'success'){
    // get user's membership
    return await usersService.getUserCustomisable(req);;
  }
  else{
    return validatedParams;
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
  membershipResend,
  membershipDelete,
  getUser,
  adminSetUserPassword,
  userLogin,
  userResetPassword,
  userForgotPassword
};

