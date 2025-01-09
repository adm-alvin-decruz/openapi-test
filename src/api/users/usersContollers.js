// use dotenv
require('dotenv').config()

const {
  CognitoIdentityProviderClient,
  AdminSetUserPasswordCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const client = new CognitoIdentityProviderClient({ region: "ap-southeast-1" });

const usersService = require('./usersServices');
const validationService = require('../../services/validationService');
const commonService = require('../../services/commonService');
const loggerService = require('../../logs/logger');
const responseHelper = require('../../helpers/responseHelpers');
const aemService = require('../../services/AEMService');
const dbService = require('./usersDBService');
const appConfig = require('../../config/appConfig');
const UserLoginJob = require("./userLoginJob");
const UserLogoutJob = require("./userLogoutJob");
const UserSignupJob = require("./userSignupJob");
const UserResetPasswordJob = require("./userResetPasswordJob");
const UserValidateRestPasswordJob = require("./userValidateResetPasswordJob");
const UserConfirmResetPasswordJob = require("./userConfirmResetPasswordJob");
const UserSignUpValidation = require("./validations/UserSignupValidation");
const UserUpdateValidation = require("./validations/UserUpdateValidation");
const CommonErrors = require("../../config/https/errors/common");
const UserConfirmResetPasswordValidation = require("./validations/UserConfirmResetPasswordValidation");
const UserValidateResetPasswordValidation = require("./validations/UserValidateResetPasswordValidation");
const UserGetMembershipPassesValidation = require("./validations/UserGetMembershipPassesValidation");
const UserGetMembershipPassesJob = require("./userGetMembershipPassesJob");
const userVerifyTokenService = require("./userVerifyTokenService");
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
      let response;
      // check if user exist
      var memberExist = await usersService.getUserMembership(req);

      // if signup check aem flag true, check user exist in AEM
      let aemResponse, aemNoMembership;
      let responseSource = 'ciam';

      if(appConfig.SIGNUP_CHECK_AEM === true && !req.body.migrations){
        aemResponse = await aemService.aemCheckWildPassByEmail(req.body);
        aemNoMembership = aemResponse.data.valid; // no membership in AEM 'true'/'false'
        if (aemNoMembership === 'false') {
          responseSource = 'aem';
        }
      }

      if(memberExist.status === 'success' || aemNoMembership === 'false'){
        // prepare response
        let errorConfig = usersService.processError(req.body, 'MWG_CIAM_USER_SIGNUP_ERR', 'email');

        // prepare logs
        let logObj = loggerService.build('user', 'usersControllers.adminCreateUser', req, 'MWG_CIAM_USER_SIGNUP_ERR', {}, errorConfig);
        // prepare error params response
        response = responseHelper.craftUsersApiResponse('usersControllers.adminCreateUser', errorConfig, 'MWG_CIAM_USER_SIGNUP_ERR', 'USERS_SIGNUP', logObj);
        response['source'] = responseSource;
        return response;

      }else{
        response = await usersService.userSignup(req);
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
 * User created and with password FOW/FOW+
 */
async function adminCreateNewUser(req) {
  const message = UserSignUpValidation.execute(req.body);
  if (!!message) {
    throw new Error(JSON.stringify(message));
  }
  try {
    return await UserSignupJob.perform(req);
  } catch(error) {
    const errorMessage = JSON.parse(error.message);
    throw new Error(JSON.stringify(errorMessage));
  }
}

/**
 * TODO: Move to user service
 *
 * @returns
 */
async function adminUpdateUser (req, listedParams){
  req['apiTimer'] = req.processTimer.apiRequestTimer();
  req.apiTimer.log('usersController.adminUpdateUser start'); // log process time

  // clean the request data for possible white space
  req['body'] = commonService.cleanData(req.body);

  try {
    // check if user exist
    var memberInfo = await usersService.getUserMembership(req);

    // user exist, can update info
    if(memberInfo.status === 'success'){
      // API validation
     let validatedParams = validationService.validateParams(req.body, 'UPDATE_WP_VALIDATE_PARAMS');

      // return errorParams;
      if(validatedParams.status === 'success'){
        let response;
        // compare input data vs membership info
        let ciamComparedParams = commonService.compareAndFilterJSON(listedParams, memberInfo.data.cognitoUser.UserAttributes);
        if(commonService.isJsonNotEmpty(ciamComparedParams) === true){
          let prepareDBUpdateData = dbService.prepareDBUpdateData(ciamComparedParams);

          response = await usersService.adminUpdateUser(req, ciamComparedParams, memberInfo.data, prepareDBUpdateData);

          req.apiTimer.end('usersController.adminUpdateUser'); // log end time
          return response;
        }
      }else{
        // prepare error params response
        errorConfig = commonService.processUserUpdateErrors(validatedParams, req.body, 'MWG_CIAM_USER_SIGNUP_ERR');
        // prepare logs
        let logObj = loggerService.build('user', 'usersControllers.adminCreateUser', req, 'MWG_CIAM_PARAMS_ERR', {}, errorConfig);
        // prepare error params response
        req.apiTimer.end('usersController.adminUpdateUser'); // log end time
        return responseHelper.craftUsersApiResponse('usersControllers.adminCreateUser', errorConfig, 'MWG_CIAM_PARAMS_ERR', 'USERS_UPDATE', logObj);
      }

    }else{
      // prepare response data
      let errorConfig = {
            "email": "This email address does not have a Mandai Account."
        }
      // prepare logs
      let logObj = loggerService.build('user', 'usersControllers.adminCreateUser', req, 'MWG_CIAM_PARAMS_ERR', {}, errorConfig);
      // prepare error params response
      req.apiTimer.end('usersController.adminUpdateUser'); // log end time
      return responseHelper.craftUsersApiResponse('usersControllers.adminCreateUser', errorConfig, 'MWG_CIAM_PARAMS_ERR', 'USERS_SIGNUP', logObj);
    }

    // prepare logs
    let logObj = loggerService.build('user', 'usersControllers.adminUpdateUser', req, 'MWG_CIAM_USER_UPDATE_SUCCESS', {"success":"no data to update"}, memberInfo);

    // prepare error params response
    req.apiTimer.end('usersController.adminUpdateUser'); // log end time
    return responseHelper.craftUsersApiResponse('usersControllers.adminUpdateUser', req.body, 'MWG_CIAM_USER_UPDATE_SUCCESS', 'USERS_UPDATE', logObj);

  } catch (error) {
    req.apiTimer.end('usersController.adminUpdateUser'); // log end time
    throw error;
  }
}

async function adminUpdateNewUser(req, token) {
  const message = UserUpdateValidation.execute(req.body);
  if (!!message) {
    throw new Error(JSON.stringify(message));
  }
  try {
    return await usersService.adminUpdateNewUser(req.body, token);
  } catch(error) {
    const errorMessage = JSON.parse(error.message);
    throw new Error(JSON.stringify(errorMessage));
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

  // clean the request data for possible white space
  req['body'] = commonService.cleanData(req.body);

  // if params no error, status success
  if(validatedParams.status === 'success'){
    let response;
    // check if user exist
    const memberInfo = await usersService.getUserMembership(req);

    if(memberInfo.status === 'success'){
      // user exist, resend membership
      response = await usersService.resendUserMembership(req, memberInfo.data.cognitoUser.UserAttributes);
      response['source'] = 'ciam';
      return response;
    }
    else if(memberInfo.status === 'not found'){
      // need to check to AEM and resend from there
      let aemResponse = await aemService.aemResendWildpass(req.body);

      if (aemResponse.data && typeof aemResponse.data === 'object'){
        if(aemResponse.data.statusCode === '200' || aemResponse.data.statusCode === 200) {
          // prepare response resend success
          let logObj = loggerService.build('user', 'usersControllers.membershipResend', req, 'MWG_CIAM_RESEND_MEMBERSHIP_SUCCESS', {}, aemResponse);
          // prepare error params response
          response = responseHelper.craftUsersApiResponse('usersControllers.membershipResend', aemResponse, 'MWG_CIAM_RESEND_MEMBERSHIP_SUCCESS', 'RESEND_MEMBERSHIP', logObj);
          response['source'] = 'aem';
          return response;
        }
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
  // clean the request data for possible white space
  req['body'] = commonService.cleanData(req.body);

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
    return usersService.getUserCustomisable(req);
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
async function userLogin(req) {
  try {
    return await UserLoginJob.perform(req);
  } catch (error) {
    const errorMessage = JSON.parse(error.message);
    throw new Error(JSON.stringify(errorMessage));
  }
}

async function userLogout(token, lang) {
  try {
    return await UserLogoutJob.perform(token, lang);
  } catch (error) {
    const errorMessage = JSON.parse(error.message);
    throw new Error(JSON.stringify(errorMessage));
  }
}

async function userResetPassword(req) {
  try {
    return await UserResetPasswordJob.perform(req);
  } catch (error) {
    const errorMessage = error && error.message ? JSON.parse(error.message) : '';
    if (!!errorMessage) {
      throw new Error(JSON.stringify(errorMessage));
    }
    throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
  }
}

async function userValidateResetPassword(passwordToken, lang) {
  const message = UserValidateResetPasswordValidation.execute(passwordToken, lang);
  if (!!message) {
    throw new Error(JSON.stringify(message));
  }
  try {
    return await UserValidateRestPasswordJob.perform(passwordToken, lang);
  } catch (error) {
    const errorMessage = error && error.message ? JSON.parse(error.message) : '';
    if (!!errorMessage) {
      throw new Error(JSON.stringify(errorMessage));
    }
    throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
  }
}

async function userConfirmResetPassword(body) {
  const message = UserConfirmResetPasswordValidation.execute(body);
  if (!!message) {
    throw new Error(JSON.stringify(message));
  }
  try {
    return await UserConfirmResetPasswordJob.perform(body);
  } catch (error) {
    const errorMessage = error && error.message ? JSON.parse(error.message) : '';
    if (!!errorMessage) {
      throw new Error(JSON.stringify(errorMessage));
    }
    throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
  }
}

async function userGetMembershipPasses(body) {
  const message = UserGetMembershipPassesValidation.execute(body);
  if (!!message) {
    throw new Error(JSON.stringify(message));
  }
  try {
    return await UserGetMembershipPassesJob.perform(body);
  } catch (error) {
    const errorMessage = error && error.message ? JSON.parse(error.message) : '';
    if (!!errorMessage) {
      throw new Error(JSON.stringify(errorMessage));
    }
    throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
  }
}

async function userVerifyToken(accessToken, email, lang) {
  try {
    return await userVerifyTokenService.verifyToken(accessToken, email, lang);
  } catch (error) {
    const errorMessage = error && error.message ? JSON.parse(error.message) : "";
    if (!!errorMessage) {
      throw new Error(JSON.stringify(errorMessage));
    }
    throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
  }
}

module.exports = {
  adminCreateUser,
  adminUpdateUser,
  membershipResend,
  membershipDelete,
  getUser,
  userLogin,
  userLogout,
  adminCreateNewUser,
  adminUpdateNewUser,
  userResetPassword,
  userConfirmResetPassword,
  userValidateResetPassword,
  userGetMembershipPasses,
  userVerifyToken,
};
