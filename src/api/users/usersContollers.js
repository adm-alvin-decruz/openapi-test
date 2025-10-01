// use dotenv
require("dotenv").config();

const usersService = require("./usersServices");
const validationService = require("../../services/validationService");
const commonService = require("../../services/commonService");
const loggerService = require("../../logs/logger");
const responseHelper = require("../../helpers/responseHelpers");
const processTimer = require("../../utils/processTimer");
const dbService = require("./usersDBService");
const UserLoginJob = require("./userLoginJob");
const UserLogoutJob = require("./userLogoutJob");
const UserSignupJob = require("./userSignupJob");
const UserResetPasswordJob = require("./userResetPasswordJob");
const UserValidateRestPasswordJob = require("./userValidateResetPasswordJob");
const UserConfirmResetPasswordJob = require("./userConfirmResetPasswordJob");
const {
  userCreateMembershipPassJob,
  userUpdateMembershipPassJob,
} = require("./userMembershipPassJob");
const UserSignUpValidation = require("./validations/UserSignupValidation");
const UserUpdateValidation = require("./validations/UserUpdateValidation");
const UserMembershipPassValidation = require("./validations/UserMembershipPassValidation");
const CommonErrors = require("../../config/https/errors/commonErrors");
const UserConfirmResetPasswordValidation = require("./validations/UserConfirmResetPasswordValidation");
const UserValidateResetPasswordValidation = require("./validations/UserValidateResetPasswordValidation");
const UserGetMembershipPassesValidation = require("./validations/UserGetMembershipPassesValidation");
const UserVerifyTokenValidation = require("./validations/UserVerifyTokenValidation");
const UserResetAccessTokenJob = require("./userRefreshAccessTokenJob");
const userVerifyTokenService = require("./userVerifyTokenService");
const UserGetMembershipPassesJob = require("./userGetMembershipPassesJob");
const { maskKeyRandomly } = require("../../utils/common");

/**
 * Create user using admin function
 *
 * User flow step 1 signup
 * User created and with  password
 */
async function adminCreateUser(req) {
  // clean the request data for possible white space
  req["body"] = commonService.cleanData(req.body);

  // API validation
  let validatedParams = validationService.validateParams(
    req.body,
    "SIGNUP_VALIDATE_PARAMS"
  );

  // return errorParams;
  if (validatedParams.status === "success") {
    // continue
    try {
      let response;
      // check if user exist
      let membershipData = await usersService.getUserMembership(req);

      let responseSource = "ciam";

      // if member already has wildpass
      if (
        membershipData.status === "hasWildpass" ||
        membershipData.status === "success"
      ) {
        // prepare response
        let errorConfig = usersService.processError(
          req.body,
          "MWG_CIAM_USER_SIGNUP_ERR",
          "email"
        );

        // prepare logs
        let logObj = loggerService.build(
          "user",
          "usersControllers.adminCreateUser",
          req,
          "MWG_CIAM_USER_SIGNUP_ERR",
          {},
          errorConfig
        );
        // prepare error params response
        response = responseHelper.craftUsersApiResponse(
          "usersControllers.adminCreateUser",
          errorConfig,
          "MWG_CIAM_USER_SIGNUP_ERR",
          "USERS_SIGNUP",
          logObj
        );
        response["source"] = responseSource;
        return response;
      } else {
        response = await usersService.userSignup(req, membershipData);
      }

      return response;
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  // prepare error params response
  let errorConfig = usersService.processErrors(
    validatedParams,
    req.body,
    "MWG_CIAM_USER_SIGNUP_ERR"
  );
  // prepare logs
  let logObj = loggerService.build(
    "user",
    "usersControllers.adminCreateUser",
    req,
    "MWG_CIAM_PARAMS_ERR",
    {},
    errorConfig
  );
  // prepare error params response
  return responseHelper.craftUsersApiResponse(
    "usersControllers.adminCreateUser",
    errorConfig,
    "MWG_CIAM_PARAMS_ERR",
    "USERS_SIGNUP",
    logObj
  );
}

/**
 * User created and with password FOW/FOW+
 */
async function adminCreateMPUser(req) {
  loggerService.log(
    {
      user: {
        membership: req.body.group,
        action: "adminCreateMPUser",
        api_header: req.headers,
        api_body: req.body,
        layer: "controller.adminCreateMPUser",
      },
    },
    "[CIAM] Start Signup with FOs Request"
  );
  if (!req.body.password && !req.body.confirmPassword) {
    req.body.is_passwordless = true;
  } else {
    req.body.is_passwordless = false;
  }
  const message = UserSignUpValidation.execute(req);
  if (message) {
    loggerService.error(
      {
        user: {
          membership: req.body.group,
          action: "adminCreateMPUser",
          layer: "controller.adminCreateMPUser",
          response_to_client: `${message}`,
        },
      },
      {},
      "[CIAM] End Signup with FOs Request - Failed"
    );
    throw new Error(JSON.stringify(message));
  }
  try {
    let signupController = await UserSignupJob.perform(req);
    return signupController
  } catch (error) {
    loggerService.error(
      {
        user: {
          membership: req.body.group,
          action: "adminCreateMPUser",
          layer: "controller.adminCreateMPUser",
          api_header: req.headers,
          api_body: req.body,
          response_to_client: new Error(error),
        },
      },
      {},
      "Signup Membership Passes Account End Request"
    );
    const errorMessage = JSON.parse(error.message);
    throw new Error(JSON.stringify(errorMessage));
  }
}

/**
 * TODO: Move to user service
 *
 * @returns
 */
async function adminUpdateUser(req, listedParams) {
  req["apiTimer"] = req.processTimer.apiRequestTimer();
  req.apiTimer.log("usersController.adminUpdateUser start"); // log process time

  // clean the request data for possible white space
  req["body"] = commonService.cleanData(req.body);

  try {
    // check if user exist
    var memberInfo = await usersService.getUserMembership(req);

    // user exist, can update info
    if (memberInfo.status === "success") {
      // API validation
      let validatedParams = validationService.validateParams(
        req.body,
        "UPDATE_WP_VALIDATE_PARAMS"
      );

      // return errorParams;
      if (validatedParams.status === "success") {
        let response;
        // compare input data vs membership info
        let ciamComparedParams = commonService.compareAndFilterJSON(
          listedParams,
          memberInfo.data.cognitoUser.UserAttributes
        );
        if (commonService.isJsonNotEmpty(ciamComparedParams) === true) {
          let prepareDBUpdateData =
            dbService.prepareDBUpdateData(ciamComparedParams);

          response = await usersService.adminUpdateUser(
            req,
            ciamComparedParams,
            memberInfo.data,
            prepareDBUpdateData
          );

          req.apiTimer.end("usersController.adminUpdateUser"); // log end time
          return response;
        }
      } else {
        // prepare error params response
        errorConfig = commonService.processUserUpdateErrors(
          validatedParams,
          req.body,
          "MWG_CIAM_USER_SIGNUP_ERR"
        );
        // prepare logs
        let logObj = loggerService.build(
          "user",
          "usersControllers.adminUpdateUser",
          req,
          "MWG_CIAM_PARAMS_ERR",
          {},
          errorConfig
        );
        // prepare error params response
        req.apiTimer.end("usersController.adminUpdateUser"); // log end time
        return responseHelper.craftUsersApiResponse(
          "usersControllers.adminUpdateUser",
          errorConfig,
          "MWG_CIAM_PARAMS_ERR",
          "USERS_UPDATE",
          logObj
        );
      }
    } else {
      // prepare response data
      let errorConfig = {
        email: "This email address does not have a Mandai Account.",
      };
      // prepare logs
      let logObj = loggerService.build(
        "user",
        "usersControllers.adminUpdateUser",
        req,
        "MWG_CIAM_PARAMS_ERR",
        {},
        errorConfig
      );
      // prepare error params response
      req.apiTimer.end("usersController.adminUpdateUser"); // log end time
      return responseHelper.craftUsersApiResponse(
        "usersControllers.adminUpdateUser",
        errorConfig,
        "MWG_CIAM_PARAMS_ERR",
        "USERS_UPDATE",
        logObj
      );
    }

    // prepare logs
    let logObj = loggerService.build(
      "user",
      "usersControllers.adminUpdateUser",
      req,
      "MWG_CIAM_USER_UPDATE_SUCCESS",
      { success: "no data to update" },
      memberInfo
    );

    // prepare error params response
    req.apiTimer.end("usersController.adminUpdateUser"); // log end time
    return responseHelper.craftUsersApiResponse(
      "usersControllers.adminUpdateUser",
      req.body,
      "MWG_CIAM_USER_UPDATE_SUCCESS",
      "USERS_UPDATE",
      logObj
    );
  } catch (error) {
    req.apiTimer.end("usersController.adminUpdateUser"); // log end time
    throw error;
  }
}

async function adminUpdateMPUser(req) {
  loggerService.log(
    {
      user: {
        membership: req.body.group,
        action: "adminUpdateMPUser",
        api_header: req.headers,
        api_body: JSON.stringify(req.body),
        layer: "controller.adminUpdateMPUser",
        private_mode: !!req.body.privateMode,
      },
    },
    "[CIAM] Start Update User with FOs Request"
  );
  const message = await UserUpdateValidation.execute(req.body);
  if (message) {
    loggerService.error(
      {
        user: {
          membership: req.body.group,
          action: "adminUpdateMPUser",
          api_header: req.headers,
          api_body: JSON.stringify(req.body),
          layer: "controller.adminUpdateMPUser",
          private_mode: !!req.body.privateMode,
          error: JSON.stringify(message)
        },
      },
      {},
      "[CIAM] End Update User with FOs Request - Failed"
    );
    throw new Error(JSON.stringify(message));
  }
  try {
    // check if it is AEM call
    const requestFromAEM = commonService.isRequestFromAEM(req.headers);
    if(!requestFromAEM){
      req.body.ncRequest = true;
    }
    return await usersService.adminUpdateMPUser(req.body);
  } catch (error) {
    loggerService.error(
      {
        user: {
          membership: req.body.group,
          action: "adminUpdateMPUser",
          api_header: req.headers,
          api_body: JSON.stringify(req.body),
          layer: "controller.adminUpdateMPUser",
          error: new Error(error),
          private_mode: !!req.body.privateMode
        },
      },
      {},
      "[CIAM] End Update User with FOs Request - Failed"
    );
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
async function membershipResend(req) {
  // API validation
  let validatedParams = validationService.validateParams(
    req.body,
    "RESEND_VALIDATE_PARAMS"
  );

  // clean the request data for possible white space
  req["body"] = commonService.cleanData(req.body);

  // if params no error, status success
  if (validatedParams.status === "success") {
    let response;
    // check if user exist
    const memberInfo = await usersService.getUserMembership(req);

    if (memberInfo.status === "success") {
      // user exist, resend membership
      response = await usersService.resendUserMembership(
        req,
        memberInfo.data.cognitoUser.UserAttributes
      );
      response["source"] = "ciam";
      return response;
    }

    // Prepare response membership not found
    let logObj = loggerService.build(
      "user",
      "usersControllers.membershipResend",
      req,
      "MWG_CIAM_USERS_MEMBERSHIP_NULL",
      {},
      memberInfo
    );
    // prepare error params response
    return responseHelper.craftUsersApiResponse(
      "usersControllers.membershipResend",
      memberInfo,
      "MWG_CIAM_USERS_MEMBERSHIP_NULL",
      "RESEND_MEMBERSHIP",
      logObj
    );
  }

  // prepare error params response
  errorConfig = usersService.processErrors(
    validatedParams,
    req.body,
    "MWG_CIAM_PARAMS_ERR"
  );
  // prepare logs
  let logObj = loggerService.build(
    "user",
    "usersControllers.membershipResend",
    req,
    "MWG_CIAM_PARAMS_ERR",
    {},
    errorConfig
  );
  // prepare error params response
  return responseHelper.craftUsersApiResponse(
    "usersControllers.membershipResend",
    errorConfig,
    "MWG_CIAM_PARAMS_ERR",
    "RESEND_MEMBERSHIP",
    logObj
  );
}

/**
 * Delete cognito membership
 *
 * @param {json} req
 * @returns
 */
async function membershipDelete(req) {
  // clean the request data for possible white space
  req["body"] = commonService.cleanData(req.body);

  // check if user exist
  var memberInfo = await usersService.getUserMembership(req);

  if (memberInfo.status === "success") {
    // user exist, can update info
    var response = await usersService.deleteMembership(req, memberInfo.data);
    return response;
  }
  let logObj = loggerService.build(
    "user",
    "usersControllers.membershipResend",
    req,
    "MWG_CIAM_USERS_MEMBERSHIP_NULL",
    {},
    {}
  );
  // prepare error params response
  return responseHelper.craftUsersApiResponse(
    "usersControllers.membershipResend",
    {},
    "MWG_CIAM_USERS_MEMBERSHIP_NULL",
    "RESEND_MEMBERSHIP",
    logObj
  );
}

/**
 * Function get membership
 */
async function getUser(req) {
  // clean the request data for possible white space
  req["body"] = commonService.cleanData(req.body);

  // API validation
  let validatedParams = validationService.validateParams(
    req.body,
    "GET_USER_VALIDATE_PARAMS"
  );

  // return errorParams;
  if (validatedParams.status === "success") {
    // get user's membership
    return usersService.getUserCustomisable(req);
  } else {
    return validatedParams;
  }
}

/**
 * TODO: Move to user service
 *
 * @returns
 */
async function userLogin(req) {
  try {
    loggerService.log(
      {
        user: {
          email: req.body.email,
          password: maskKeyRandomly(req.body.password),
          layer: "controller.userLogin",
        },
      },
      "[CIAM] Start Login Request"
    );
    return await UserLoginJob.perform(req);
  } catch (error) {
    loggerService.error(
      {
        user: {
          email: req.body.email,
          password: maskKeyRandomly(req.body.password),
          layer: "controller.userLogin",
          error: `${error}`,
        },
      },
      {},
      "[CIAM] End Login Request - Failed"
    );
    const errorMessage = JSON.parse(error.message);
    throw new Error(JSON.stringify(errorMessage));
  }
}

async function userLogout(token, body) {
  try {
    loggerService.log(
      {
        user: {
          token: maskKeyRandomly(token),
          layer: "controller.userLogout",
        },
      },
      "[CIAM] Start Logout Request"
    );
    return await UserLogoutJob.perform(token, body);
  } catch (error) {
    loggerService.error(
      {
        user: {
          token: maskKeyRandomly(token),
          layer: "controller.userLogout",
          error: new Error(error),
        },
      },
      {},
      "[CIAM] End Logout Request - Failed"
    );
    const errorMessage = JSON.parse(error.message);
    throw new Error(JSON.stringify(errorMessage));
  }
}

async function userResetPassword(req) {
  try {
    loggerService.log(
      {
        user: {
          email: req.body.email,
          layer: "controller.userResetPassword",
        },
      },
      "[CIAM] Start userResetPassword Request"
    );
    return await UserResetPasswordJob.perform(req);
  } catch (error) {
    loggerService.log(
      {
        user: {
          email: req.body.email,
          layer: "controller.userResetPassword",
          error: new Error(error),
        },
      },
      "[CIAM] End userResetPassword Request - Failed"
    );
    const errorMessage =
      error && error.message ? JSON.parse(error.message) : "";
    if (errorMessage) {
      throw new Error(JSON.stringify(errorMessage));
    }
    throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
  }
}

async function userValidateResetPassword(passwordToken, lang) {
  const message = UserValidateResetPasswordValidation.execute(
    passwordToken,
    lang
  );
  if (message) {
    throw new Error(JSON.stringify(message));
  }
  try {
    return await UserValidateRestPasswordJob.perform(passwordToken, lang);
  } catch (error) {
    const errorMessage =
      error && error.message ? JSON.parse(error.message) : "";
    if (errorMessage) {
      throw new Error(JSON.stringify(errorMessage));
    }
    throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
  }
}

async function userConfirmResetPassword(reqBody) {
  const message = await UserConfirmResetPasswordValidation.execute(reqBody);
  if (message) {
    throw new Error(JSON.stringify(message));
  }
  try {
    return await UserConfirmResetPasswordJob.perform(reqBody);
  } catch (error) {
    const errorMessage =
      error && error.message ? JSON.parse(error.message) : "";
    if (errorMessage) {
      throw new Error(JSON.stringify(errorMessage));
    }
    throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
  }
}

async function userGetMembershipPasses(body) {
  loggerService.log(
    {
      user: {
        action: "userGetMembershipPasses",
        api_body: body,
        layer: "controller.userGetMembershipPasses",
      },
    },
    "[CIAM] userGetMembershipPasses Start Request"
  );
  const message = UserGetMembershipPassesValidation.execute(body);
  if (message) {
    loggerService.log(
      {
        user: {
          action: "userGetMembershipPasses",
          api_body: body,
          response: `${message}`,
          layer: "controller.userGetMembershipPasses",
        },
      },
      "[CIAM] End userGetMembershipPasses Request - Failed"
    );
    throw new Error(JSON.stringify(message));
  }
  try {
    return await UserGetMembershipPassesJob.perform(body);
  } catch (error) {
    loggerService.log(
      {
        user: {
          action: "userGetMembershipPasses",
          api_body: body,
          response: `${error}`,
          layer: "controller.userGetMembershipPasses",
        },
      },
      "[CIAM] End userGetMembershipPasses Request - Failed"
    );
    const errorMessage =
      error && error.message ? JSON.parse(error.message) : "";
    if (errorMessage) {
      throw new Error(JSON.stringify(errorMessage));
    }
    throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
  }
}

async function userVerifyToken(accessToken, body) {
  const valError = UserVerifyTokenValidation.execute(body);
  if (valError) {
    loggerService.error(
      {
        user: {
          action: "userVerifyToken",
          api_body: body,
          error: new Error(valError),
          layer: "controller.userGetMembershipPasses",
        },
      },
      {},
      "[CIAM] End userVerifyToken Request - Failed"
    );
    throw new Error(JSON.stringify(valError));
  }
  try {
    return await userVerifyTokenService.verifyToken(accessToken, body);
  } catch (error) {
    const errorMessage =
      error && error.message ? JSON.parse(error.message) : "";
    if (errorMessage) {
      throw new Error(JSON.stringify(errorMessage));
    }
    throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
  }
}

async function userCreateMembershipPass(req, res) {
  req["processTimer"] = processTimer;
  req["apiTimer"] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();
  const bodyLogger = {...req.body};
  if (bodyLogger.membershipPhoto && bodyLogger.membershipPhoto.bytes) {
    bodyLogger.membershipPhoto = JSON.stringify({ bytes: maskKeyRandomly(bodyLogger.membershipPhoto.bytes)})
  }
  loggerService.log(
    {
      user: {
        membership: req.body.group,
        action: "userCreateMembershipPass",
        api_header: req.headers,
        api_body: bodyLogger,
        layer: "controller.userCreateMembershipPass",
      },
    },
    "[CIAM] userCreateMembershipPass Start Request"
  );
  // validate req app-id
  const valAppID = validationService.validateAppID(req.headers);
  if (!valAppID) {
    req.apiTimer.end(
      "Route CIAM Create Membership Pass Error 401 Unauthorized",
      startTimer
    );
    return res
      .status(401)
      .send(CommonErrors.UnauthorizedException(req.body.language));
  }

  const message =
    await UserMembershipPassValidation.validateCreateUserMembershipPass(req);
  if (message) {
    loggerService.error(
      {
        user: {
          userEmail: req.body.email,
          membership: req.body.group,
          action: "userCreateMembershipPass Validation",
          layer: "controller.userCreateMembershipPass",
          response_to_client: JSON.stringify(message),
        },
      },
      {},
      "[CIAM] userCreateMembershipPass End Request"
    );
    return res.status(400).json(message);
  }

  try {
    const data = await userCreateMembershipPassJob.perform(req);

    loggerService.log(
      {
        user: {
          userEmail: req.body.email,
          membership: req.body.group,
          action:
            "userCreateMembershipPass call userCreateMembershipPassJob.perform",
          layer: "controller.userCreateMembershipPass",
          response_from_client: JSON.stringify(data),
        },
      },
      "[CIAM] userCreateMembershipPass End Request - Success"
    );
    return res.status(data.statusCode).json(data);
  } catch (error) {
    loggerService.error(
      {
        user: {
          userEmail: req.body.email,
          membership: req.body.group,
          action: "userCreateMembershipPass",
          layer: "controller.userCreateMembershipPass",
          response_to_client: error,
        },
      },
      {},
      "[CIAM] userCreateMembershipPass End Request"
    );
    const errorMessage = JSON.parse(error.message);
    return res.status(errorMessage.statusCode).json(errorMessage);
  }
}

async function userUpdateMembershipPass(req, res) {
  req["processTimer"] = processTimer;
  req["apiTimer"] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();

  const bodyLogger = {...req.body};
  if (bodyLogger.membershipPhoto && bodyLogger.membershipPhoto.bytes) {
    bodyLogger.membershipPhoto = JSON.stringify({ bytes: maskKeyRandomly(bodyLogger.membershipPhoto.bytes)})
  }
  loggerService.log(
    {
      user: {
        membership: req.body.group,
        action: "userUpdateMembershipPass",
        api_header: req.headers,
        api_body: bodyLogger,
        layer: "controller.userUpdateMembershipPass",
      },
    },
    "[CIAM] userUpdateMembershipPass Start Request"
  );
  // validate req app-id
  const valAppID = validationService.validateAppID(req.headers);
  if (!valAppID) {
    req.apiTimer.end(
      "Route CIAM Update Membership Pass Error 401 Unauthorized",
      startTimer
    );
    return res
      .status(401)
      .send(CommonErrors.UnauthorizedException(req.body.language));
  }

  const message =
    await UserMembershipPassValidation.validateUpdateUserMembershipPass(req);
  if (message) {
    loggerService.error(
      {
        user: {
          membership: req.body.group,
          action: "userUpdateMembershipPass",
          layer: "controller.userUpdateMembershipPass",
          api_header: req.headers,
          api_body: req.body,
          response_to_client: `${message}`,
        },
      },
      {},
      "[CIAM] userUpdateMembershipPass End Request"
    );
    return res.status(400).json(message);
  }

  try {
    const data = await userUpdateMembershipPassJob.perform(req);
    loggerService.log(
      {
        user: {
          membership: req.body.group,
          action: "userUpdateMembershipPass",
          layer: "controller.userUpdateMembershipPass",
          api_header: req.headers,
          api_body: req.body,
          response_to_client: data,
        },
      },
      "[CIAM] userUpdateMembershipPass End Request - Success"
    );
    return res.status(data.statusCode).json(data);
  } catch (error) {
    loggerService.error(
      {
        user: {
          membership: req.body.group,
          action: "userUpdateMembershipPass",
          layer: "controller.userUpdateMembershipPass",
          api_header: req.headers,
          api_body: req.body,
          response_to_client: `${error}`,
        },
      },
      {},
      "[CIAM] userUpdateMembershipPass End Request"
    );
    const errorMessage = JSON.parse(error.message);
    return res.status(errorMessage.statusCode).json(errorMessage);
  }
}

async function userRefreshAccessToken(accessToken, req) {
  try {
    loggerService.log(
      {
        user: {
          action: "userRefreshAccessToken",
          layer: "controller.userRefreshAccessToken",
          api_header: req.headers,
          api_body: req.body,
        },
      },
      "[CIAM] userRefreshAccessToken Start Request"
    );
    return await UserResetAccessTokenJob.perform(accessToken, req.body);
  } catch (error) {
    loggerService.error(
        {
          user: {
            action: "userRefreshAccessToken",
            layer: "controller.userRefreshAccessToken",
            response_to_client: new Error(error),
          },
        },
        {url: "/token/refresh"},
        "[CIAM] userRefreshAccessToken End Request - Failed"
    );
    const errorMessage =
        error && error.message ? JSON.parse(error.message) : "";
    if (errorMessage) {
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
  adminCreateMPUser,
  adminUpdateMPUser,
  userResetPassword,
  userConfirmResetPassword,
  userValidateResetPassword,
  userGetMembershipPasses,
  userVerifyToken,
  userCreateMembershipPass,
  userUpdateMembershipPass,
  userRefreshAccessToken
};
