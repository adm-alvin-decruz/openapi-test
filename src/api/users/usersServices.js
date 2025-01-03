/**
 * This service should use to process membership related only
 * Process response after getting the result from cognito
 */

// use dotenv
require('dotenv').config();

const awsRegion = () => {
  const env = process.env.AWS_REGION_NAME;
  if (!env) return 'ap-southeast-1';
  if (env === "false") return 'ap-southeast-1';
  return env;
}
const {
  CognitoIdentityProviderClient, AdminGetUserCommand, AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminDisableUserCommand
} = require("@aws-sdk/client-cognito-identity-provider");
const client = new CognitoIdentityProviderClient({ region: awsRegion });

const passwordService = require('../users/userPasswordService');
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
const switchService = require('../../services/switchService');
const CommonErrors = require("../../config/https/errors/common");
const { getOrCheck } = require("../../utils/cognitoAttributes");
const UpdateUserErrors = require("../../config/https/errors/updateUserErrors");
const { COGNITO_ATTRIBUTES } = require("../../utils/constants");
const { messageLang } = require("../../utils/common");
const userModel = require("../../db/models/userModel");
const userCredentialModel = require("../../db/models/userCredentialModel");
const pool = require("../../db/connections/mysqlConn");
const MembershipErrors = require("../../config/https/errors/membershipErrors");
const LoginErrors = require("../../config/https/errors/loginErrors");

/**
 * Function User signup service
 * @param {json} req
 * @returns
 */
async function userSignup(req){
  // get switches from DB
  req['dbSwitch'] = await switchService.getAllSwitches();
  // set the source base on app ID
  req['body']['source'] = commonService.setSource(req);

  // generate Mandai ID
  let mandaiID = usersSignupHelper.generateMandaiID(req.body);
  if(mandaiID.error){
    return mandaiID;
  }
  req.body['mandaiID'] = mandaiID;

  // prepare membership group
  req['body']['membershipGroup'] = commonService.prepareMembershipGroup(req.body);

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
      {"Name": "name"          , "Value": req.body.firstName +" "+req.body.lastName},
      {"Name": "email"         , "Value": req.body.email},
      {"Name": "birthdate"     , "Value": req.body.dob},
      {"Name": "address"       , "Value": req.body.address ? req.body.address : ''},
      // custom fields
      {"Name": "custom:membership", "Value": JSON.stringify(req.body.membershipGroup)},
      {"Name": "custom:mandai_id", "Value": req.body.mandaiID},
      {"Name": "custom:newsletter", "Value": JSON.stringify(req.body.newsletter)},
      {"Name": "custom:terms_conditions", "Value": "null"},
      {"Name": "custom:visual_id", "Value": "null"},
      {"Name": "custom:vehicle_iu", "Value": "null"},
      {"Name": "custom:vehicle_plate", "Value": "null"},
      {"Name": "custom:last_login", "Value": "null"},
      {"Name": "custom:source", "Value": req.body.source},
      {"Name": "custom:1", "Value": req.body.registerTime ? req.body.registerTime : ''},
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
      return usersSignupHelper.createUserSignupDB(req);
    });

    // push to queue for Galaxy Import Pass
    const galaxySQS = await galaxyWPService.galaxyToSQS(req, 'userSignup');

    // user migration - update user_migrations table for signup & sqs status
    if(req.body.migrations){
      if(galaxySQS.$metadata.httpStatusCode === 200) {
        await userDBService.updateUserMigration(req, 'signup', 'signupSQS');
      }
    }

    response = {
      cognito: cognitoResponse,
      db: JSON.stringify(dbResponse),
      galaxy: galaxySQS
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
    let responseErrorToClient = responseHelper.craftUsersApiResponse('', '', 'MWG_CIAM_USER_SIGNUP_ERR', 'USERS_SIGNUP', logObj);
    console.log('usersServices.createUserService', new Error(`[CIAM-MAIN] Signup Error: ${error}`))
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
  let response = {};
  try {
    // get from cognito
    let cognitoUserRes = await client.send(getUserCommand);

    // read from database
    let dbUserRes;
    if(req.body.group === 'wildpass'){
      dbUserRes = await userDBService.queryWPUserByEmail(req.body);
    }else{
      dbUserRes = await userDBService.getDBUserByEmail(req.body);
    }

    response = {
      cognitoUser: cognitoUserRes,
      db_user: dbUserRes
    };

    // prepare logs
    let logObj = loggerService.build('user', 'usersServices.getUserMembership', req, '', getMemberJson, response);
    // prepare response to client
    let responseToInternal = responseHelper.craftGetMemberShipInternalRes('', req.body, 'success', response, logObj);

    req.apiTimer.end('usersServices.getUserMembership'); // log end time
    return responseToInternal;

  } catch (error) {
    if(error.name === 'UserNotFoundException'){
      response = {"status": "not found", "data": error};
    }else{
      response = {"status": "failed", "data": error};
    }
    req.apiTimer.end('usersServices.getUserMembership error'); // log end time
  }

  let logObj = loggerService.build('user', 'usersServices.getUserMembership', req, '', getMemberJson, response);
  loggerService.log(logObj);

  return response;
}

/**
 * Update user CIAM info
 * NOTE: new cardface will generate by passkit email trigger
 */
async function adminUpdateUser (req, ciamComparedParams, membershipData, prepareDBUpdateData){
  // get switches from DB
  req['dbSwitch'] = await switchService.getAllSwitches();
  req['apiTimer'] = req.processTimer.apiRequestTimer();
  req.apiTimer.log('usersServices:adminUpdateUser start'); // log process time

  // add name params to cognito request, make sure update value if there's changes otherwise no change.
  let name = usersUpdateHelpers.createNameParameter(req.body, membershipData.cognitoUser.UserAttributes);
  ciamComparedParams.push(name);

  let response = {};

  // get mandai ID
  req.body['mandaiID'] = membershipData.db_user.mandai_id;
  req.body['visualID'] = membershipData.db_user.visual_id;

  try {
    // save to cognito
    let cognitoRes = await cognitoService.cognitoAdminUpdateUser(req, ciamComparedParams)

    // save to DB
    let updateDBRes = await userUpdateHelper.updateDBUserInfo(req, prepareDBUpdateData, membershipData.db_user);

    // galaxy update move to sqs. Push to SQS queue for Galaxy Import Pass
    req.body["ciamComparedParams"] = ciamComparedParams;
    req.body["membershipData"] = membershipData;
    response['galaxyUpdate'] = await galaxyWPService.galaxyToSQS(req, 'userUpdate');

    response = {
      cognito: cognitoRes,
      updateDB: updateDBRes,
    };

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

async function updateDB(body, userId) {
  if (!userId) {
    throw new Error(JSON.stringify(UpdateUserErrors.ciamEmailNotExists(body.language)))
  }
  //update DB
  try {
    await pool.transaction(async () => {
      if (body.firstName || body.lastName || body.dob) {
        await userDBService.userModelExecuteUpdate(userId, body.firstName, body.lastName, body.dob);
      }
      if (body.newsletter && body.newsletter.subscribe) {
        await userDBService.userNewsletterModelExecuteUpdate(userId, body.newsletter)
      }
      if (body.group) {
        await userDBService.userMembershipModelExecuteUpdate(userId, body.group)
      }
      if (body.phoneNumber) {
        await userDBService.userDetailsModelExecuteUpdate(userId, body.phoneNumber)
      }
      if (body.password) {
        const hashPassword = await passwordService.hashPassword(
            body.password.toString()
        );
        await userCredentialModel.updatePassword(userId, hashPassword)
      }
    });
  } catch (error) {
    loggerService.error(`usersService.updateDB Error: ${error}`);
    throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
  }
}
/**
 * Update user FOW/FOW+ CIAM info
 * NOTE: new cardface will be confirm
 */
async function adminUpdateNewUser(body, token) {
  try {
    //get user from cognito
    const userInfo = await cognitoService.cognitoAdminGetUserByAccessToken(token);
    const email = getOrCheck(userInfo, 'email');
    let userName = getOrCheck(userInfo, 'name');
    const userFirstName = getOrCheck(userInfo, 'given_name');
    const userLastName = getOrCheck(userInfo, 'family_name');

    //update DB
    //get user from db
    const userDB = await userModel.findByEmail(email);
    await updateDB(body, userDB && userDB.id ? userDB.id : undefined);


    //cognito update user password by accessToken
    //attempts limit: Lockout behavior for failed attempts
    if (body.password) {
      await cognitoService.cognitoUserChangePassword(token, body.password, body.oldPassword);
    }

    const cognitoParams = Object.keys(body).map((key) => {
      //need to confirm with Kay about these properties here
      if (['uuid', 'country', 'password', 'confirmPassword', 'oldPassword'].includes(key)) {
        return;
      }
      if (key === 'group') {
        return {
          Name: COGNITO_ATTRIBUTES[key],
          Value: JSON.stringify([
            {
              name: body.group,
              visualID: "",
              expiry: ""
            }
          ])
        }
      }
      if (key === 'newsletter') {
        return {
          Name: COGNITO_ATTRIBUTES[key],
          Value: JSON.stringify(body.newsletter)
        }
      }
      return {
        Name: COGNITO_ATTRIBUTES[key],
        Value: body[key]
      }
    }).filter(ele => !!ele);

    //replace for user name
    if (body.firstName && userFirstName) {
      userName = userName.replace(userFirstName.toString(), body.firstName);
    }
    if (body.lastName && userLastName) {
      userName = userName.replace(userLastName.toString(), body.lastName);
    }

    //cognito update user
    await cognitoService.cognitoAdminUpdateNewUser([
        ...cognitoParams,
      {
        Name: 'name',
        Value: userName
      }
    ], email);

    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_USER_UPDATE_SUCCESS",
        message: messageLang('update_success', body.language),
      },
      status: "success",
      statusCode: 200,
    }
  } catch (error) {
    const errorMessage = error.message ? JSON.parse(error.message) : '';
    const errorData =
        errorMessage.data && errorMessage.data.name ? errorMessage.data : "";
    if (errorData.name && errorData.name === "UserNotFoundException") {
      throw new Error(JSON.stringify(UpdateUserErrors.ciamEmailNotExists(body.language)))
    }
    if (errorData.name && errorData.name === "NotAuthorizedException") {
      throw new Error(JSON.stringify(CommonErrors.UnauthorizedException(body.language)))
    }
    throw new Error(JSON.stringify(errorMessage));
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
function processError(reqBody, mwgCode, attr=''){
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
  req['dbSwitch'] = await switchService.getAllSwitches();
  // clean the request data for possible white space
  req.body = commonService.cleanData(req.body);

  // find user attribute value for mandaiID
  req.body['mandaiID'] = commonService.findUserAttributeValue(memberAttributes, 'custom:mandai_id');
  req.body['firstName'] = commonService.findUserAttributeValue(memberAttributes, 'given_name')

  try {
    // resend wildpass email
    req.body['emailType'] = 'update_wp'; // use wildpass re-send template
    req.body['resendWpWithPasskit'] = await switchService.findSwitchValue(req.dbSwitch, "signup_email_passkit");
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
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        dateOfBirth: dob,
        mandaiId: req.body.mandaiID,
        visualId: req.body.visualID,
        passType: "wildpass"
    };

   try {
      // lambda invoke
      const response = await lambdaService.lambdaInvokeFunction(event, functionName);

      req.apiTimer.end('usersServices.prepareWPCardfaceInvoke'); // log end time

      if(response.statusCode === 200){
        console.log("[CIAM MAIN] Generate cardface", response);
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

  let response = {};
  let setDeleteParams;
  let dbRes;
  try {

    if(['dev', 'uat'].includes(process.env.APP_ENV) ){
      setDeleteParams = new AdminDeleteUserCommand(deleteUserArray);
      // delete in DB
      if(JSON.stringify(membershipData.db_user) != undefined){
        dbRes = await userDeleteHelper.deleteDBUserInfo(membershipData.db_user);
      }
    }
    // TODO: need to test again Prod env
    if(['prod'].includes(process.env.APP_ENV) ){
      setDeleteParams = new AdminDisableUserCommand(deleteUserArray);
      // disable in DB
      if(JSON.stringify(membershipData.db_user) != undefined){
        dbRes = await userDeleteHelper.disableDBUser(membershipData.db_user);
      }
    }

    // delete/disable from cognito
    let cognitoRes = await client.send(setDeleteParams);

    response = {
      delete_user_db: dbRes,
      delete_user_cognito: cognitoRes
    };

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
  let response = {};
  try {
    // get from cognito
    response['cognitoUser'] = await client.send(getUserCommand);
    // read from database
    if(req.body.group === 'wildpass'){
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
       let logObj = loggerService.build('user', 'usersServices.prepareGenPasskitInvoke', req, 'MWG_CIAM_USER_SIGNUP_ERR', event, response);
       // prepare response to client
       return responseHelper.craftUsersApiResponse('', req.body, 'MWG_CIAM_USER_SIGNUP_ERR', 'USERS_SIGNUP', logObj);
     }
   } catch (error) {
     // prepare logs
     let logObj = loggerService.build('user', 'usersServices.prepareGenPasskitInvoke', req, 'MWG_CIAM_USER_SIGNUP_ERR', event, error);
     // prepare log response
     responseHelper.craftUsersApiResponse('', req.body, 'MWG_CIAM_USER_SIGNUP_ERR', 'USERS_SIGNUP', logObj);

   return error
 }
}

/**
 * User Request Reset Password
 *
 * @param {email: string, language: en - optional} reqBody { email: string }
 * @returns
 */
async function requestResetPassword(reqBody) {
  const hashSecret = genSecretHash(
      reqBody.email,
      process.env.USER_POOL_CLIENT_ID,
      process.env.USER_POOL_CLIENT_SECRET
  );
  try {
    const userCognito = await cognitoService.cognitoAdminGetUserByEmail(reqBody.email);
    const email = getOrCheck(userCognito, 'email');
    console.log('userCognito', userCognito);
    console.log('email', email)
    const a = await cognitoService.cognitoForgotPassword(email, hashSecret);
    console.log('a', a)
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_USERS_EMAIL_RESET_PASSWORD_SUCCESS",
        message: messageLang("request_reset_password_success", reqBody.language),
        email: email
      },
      status: "success",
      statusCode: 200,
    }
  } catch (error) {
    const errorMessage = error.message ? JSON.parse(error.message) : '';
    const errorData =
        errorMessage.data && errorMessage.data.name ? errorMessage.data : "";
    if (errorData.name && errorData.name === "UserNotFoundException") {
      throw new Error(JSON.stringify(MembershipErrors.ciamMembershipUserNotFound(reqBody.email, reqBody.language)))
    }
    throw new Error(JSON.stringify(LoginErrors.ciamLoginEmailInvalid(reqBody.email, reqBody.language)));
  }
}

/**
 * User Confirm Reset Password
 *
 * @param {{passwordToken: string, newPassword: string, confirmPassword: string, email: string}} reqBody { email: string }
 * @returns
 */
async function userConfirmResetPassword(reqBody) {
  const hashSecret = genSecretHash(
      reqBody.email,
      process.env.USER_POOL_CLIENT_ID,
      process.env.USER_POOL_CLIENT_SECRET
  );
  try {
    const userCognito = await cognitoService.cognitoAdminGetUserByEmail(reqBody.email);
    const userEmail = getOrCheck(userCognito, 'email');
    await cognitoService.cognitoConfirmForgotPassword(userEmail, hashSecret, reqBody.passwordToken, reqBody.newPassword);
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_USERS_EMAIL_RESET_PASSWORD_SUCCESS",
        message: messageLang("confirm_reset_password_success", reqBody.language),
        email: userEmail,
        resetCompletedAt: new Date()
      },
      status: "success",
      statusCode: 200,
    }
  } catch (error) {
    const errorMessage = error.message ? JSON.parse(error.message) : '';
    const errorData =
        errorMessage.data && errorMessage.data.name ? errorMessage.data : "";
    if (errorData.name && errorData.name === "UserNotFoundException") {
      throw new Error(JSON.stringify(MembershipErrors.ciamMembershipUserNotFound(reqBody.email, reqBody.language)))
    }
    if (errorData.name && errorData.name === "ExpiredCodeException") {
      throw new Error(JSON.stringify(CommonErrors.PasswordExpireOrBeingUsed(reqBody.language)))
    }
    throw new Error(JSON.stringify(LoginErrors.ciamLoginEmailInvalid(reqBody.email, reqBody.language)));
  }
}

async function retryOperation(operation, maxRetries = 9, delay = 200) {
  let lastError = [];
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError[attempt+1] = `Attempt ${attempt + 1} failed: ` + error.message;
      await setTimeoutPromise(delay);
    }
  }

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
  processErrors,
  adminUpdateNewUser,
  requestResetPassword,
  userConfirmResetPassword
};
