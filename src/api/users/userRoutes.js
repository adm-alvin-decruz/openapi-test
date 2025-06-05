require("dotenv").config();
const express = require("express");
const router = express.Router();
const multer = require("multer");

const userController = require("./usersContollers");
const commonService = require("../../services/commonService");
const validationService = require("../../services/validationService");
const {
  isEmptyRequest,
  validateEmail,
  AccessTokenAuthGuard,
  AccessTokenAuthGuardByAppIdGroupFOSeries,
  lowercaseTrimKeyValueString,
  validateAPIKey,
} = require("../../middleware/validationMiddleware");
const userConfig = require("../../config/usersConfig");
const processTimer = require("../../utils/processTimer");
const crypto = require("crypto");
const uuid = crypto.randomUUID();
const { GROUP, GROUPS_SUPPORTS } = require("../../utils/constants");
const CommonErrors = require("../../config/https/errors/commonErrors");
const loggerService = require("../../logs/logger");
const { maskKeyRandomly } = require("../../utils/common");
const { RateLimitMiddleware } = require("../../middleware/rateLimitMiddleware");

const pong = { pong: "pang" };

router.use(express.json());

router.get("/ping", async (req, res) => {
  return res.json(pong);
});

/**
 * User signup, create new CIAM user
 */
router.post("/users", RateLimitMiddleware, isEmptyRequest, validateEmail, lowercaseTrimKeyValueString, async (req, res) => {
  req["processTimer"] = processTimer;
  req["apiTimer"] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();

  // validate req app-id
  const valAppID = validationService.validateAppID(req.headers);
  if (!valAppID) {
    req.apiTimer.end("Route CIAM Signup User Error Unauthorized", startTimer);
    return res
      .status(401)
      .send(CommonErrors.UnauthorizedException(req.body.language));
  }

  if (!req.body.group || !GROUPS_SUPPORTS.includes(req.body.group)) {
    return res
      .status(400)
      .json(
        CommonErrors.BadRequest("group", "group_invalid", req.body.language)
      );
  }

  //#region Signup Membership Passes
  if ([GROUP.MEMBERSHIP_PASSES].includes(req.body.group)) {
    try {
      const signupRs = await userController.adminCreateMPUser(req);
      req.apiTimer.end("Route CIAM Signup New User Success", startTimer);
      return res.status(signupRs.statusCode).send(signupRs);
    } catch (error) {
      req.apiTimer.end("Route CIAM Signup New User Error", startTimer);
      const errorMessage = JSON.parse(error.message);
      return res.status(errorMessage.statusCode).send(errorMessage);
    }
  }
  //#endregion

  //#region Signup Wildpass
  // validate request params is listed, NOTE: listedParams doesn't have email
  const listedParams = commonService.mapCognitoJsonObj(
    userConfig.WILDPASS_SOURCE_COGNITO_MAPPING,
    req.body
  );

  if (commonService.isJsonNotEmpty(listedParams) === false) {
    return res.status(400).json({ error: "Bad Requests" });
  }
  req.body.uuid = uuid;
  let newUser = await userController.adminCreateUser(req);

  req.apiTimer.end("Route CIAM Signup User", startTimer);
  if (newUser.error) {
    return res.status(400).json(newUser);
  }

  if ("membership" in newUser && "code" in newUser.membership) {
    return res.status(newUser.membership.code).json(newUser);
  }
  return res.status(200).json(newUser);

  //#endregion
});

/**
 * CIAM Update user info
 *
 * Handling most HTTP validation here
 */
router.put("/users",
  RateLimitMiddleware,
  isEmptyRequest,
  validateEmail,
  AccessTokenAuthGuardByAppIdGroupFOSeries,
  lowercaseTrimKeyValueString,
  async (req, res) => {
    req["processTimer"] = processTimer;
    req["apiTimer"] = req.processTimer.apiRequestTimer(true); // log time durations
    req.body.uuid = uuid;
    const startTimer = process.hrtime();

    // validate req app-id
    const valAppID = validationService.validateAppID(req.headers);
    if (!valAppID) {
      req.apiTimer.end(
        "Route CIAM Update User Error 401 Unauthorized",
        startTimer
      );
      return res
        .status(401)
        .send(CommonErrors.UnauthorizedException(req.body.language));
    }

    if (!req.body.group || !GROUPS_SUPPORTS.includes(req.body.group)) {
      return res
        .status(400)
        .json(
          CommonErrors.BadRequest("group", "group_invalid", req.body.language)
        );
    }
    // region Update Account Membership Passes
    if ([GROUP.MEMBERSHIP_PASSES].includes(req.body.group)) {
      try {
        const updateRs = await userController.adminUpdateMPUser(req);
        if (res.newAccessToken) {
          updateRs.membership.accessToken = res.newAccessToken;
        }
        req.apiTimer.end("Route CIAM Update New User Success", startTimer);
        return res.status(updateRs.statusCode).send(updateRs);
      } catch (error) {
        req.apiTimer.end("Route CIAM Update New User Error", startTimer);
        const errorMessage = JSON.parse(error.message);
        return res.status(errorMessage.statusCode).send(errorMessage);
      }
    }
    //#endregion

    // clean the request data for possible white space
    req["body"] = commonService.cleanData(req.body);
    // validate request params is listed, NOTE: listedParams doesn't have email
    var listedParams = commonService.mapCognitoJsonObj(
      userConfig.WILDPASS_SOURCE_COGNITO_MAPPING,
      req.body
    );

    if (commonService.isJsonNotEmpty(listedParams) === false) {
      return res.status(400).json({ error: "Bad Requests" });
    }

    if (valAppID === true) {
      let updateUser = await userController.adminUpdateUser(req, listedParams);

      req.apiTimer.end("Route CIAM Update User ", startTimer);
      if ("membership" in updateUser && "code" in updateUser.membership) {
        return res.status(updateUser.membership.code).json(updateUser);
      }
      return res.status(200).json(updateUser);
    } else {
      req.apiTimer.end("Route CIAM Update User Error Unauthorized", startTimer);
      return res.status(401).send({ error: "Unauthorized" });
    }
  }
);

/**
 * Resend wildpass
 */
router.post(
  "/users/memberships/resend",
  RateLimitMiddleware,
  isEmptyRequest,
  validateEmail,
  async (req, res) => {
    req["processTimer"] = processTimer;
    req["apiTimer"] = req.processTimer.apiRequestTimer(true); // log time durations
    const startTimer = process.hrtime();

    // validate req app-id
    var valAppID = validationService.validateAppID(req.headers);

    if (valAppID === true) {
      let resendUser = await userController.membershipResend(req);

      req.apiTimer.end("Route CIAM Resend Membership ", startTimer);
      let code = 200;
      if ("membership" in resendUser && "code" in resendUser.membership) {
        code = resendUser.membership.code;
      }
      return res.status(200).json(resendUser);
    } else {
      req.apiTimer.end(
        "Route CIAM Resend Membership Error 401 Unauthorized",
        startTimer
      );
      return res.status(401).send({ error: "Unauthorized" });
    }
  }
);

/**
 * Delete user in cognito & DB
 * only in dev/UAT
 */
router.post(
  "/users/delete",
  RateLimitMiddleware,
  isEmptyRequest,
  validateEmail,
  async (req, res) => {
    req["processTimer"] = processTimer;
    req["apiTimer"] = req.processTimer.apiRequestTimer(true); // log time durations
    const startTimer = process.hrtime();

    // validate req app-id
    var valAppID = validationService.validateAppID(req.headers);
    if (valAppID === true) {
      // allow dev, uat & prod to call. Prod will disable, no deletion
      if (["dev", "uat", "prod"].includes(process.env.APP_ENV)) {
        let deleteMember = await userController.membershipDelete(req);

        req.apiTimer.end("Route CIAM Delete User", startTimer);
        return res.status(200).json({ deleteMember });
      } else {
        req.apiTimer.end(
          "Route CIAM Delete User Error 501 Not Implemented",
          startTimer
        );
        return res.status(501).json({ error: "Not Implemented" });
      }
    } else {
      req.apiTimer.end(
        "Route CIAM Delete User Error 401 Unauthorized",
        startTimer
      );
      return res.status(401).send({ error: "Unauthorized" });
    }
  }
);

/**
 * Get User API (Method Get)
 */
router.get(
  "/users",
  RateLimitMiddleware,
  isEmptyRequest,
  validateEmail,
  async (req, res) => {
    req["processTimer"] = processTimer;
    req["apiTimer"] = req.processTimer.apiRequestTimer(true); // log time durations
    const startTimer = process.hrtime();

    // validate req app-id
    const valAppID = validationService.validateAppID(req.headers);

    if (valAppID === true) {
      let getUser = await userController.getUser(req);

      req.apiTimer.end("Route CIAM Get User", startTimer);
      return res.status(200).json(getUser);
    } else {
      req.apiTimer.end(
        "Route CIAM Get User Error 401 Unauthorized",
        startTimer
      );
      return res.status(401).send({ error: "Unauthorized" });
    }
  }
);

/**
 * User Login API (Method POST)
 */
router.post("/users/sessions", RateLimitMiddleware, isEmptyRequest, validateEmail, async (req, res) => {
    req["processTimer"] = processTimer;
    req["apiTimer"] = req.processTimer.apiRequestTimer(true); // log time durations
    const startTimer = process.hrtime();
    // validate req app-id
    const valAppID = validationService.validateAppID(req.headers);
    if (!valAppID) {
      req.apiTimer.end(
        "Route CIAM Login User Error 401 Unauthorized",
        startTimer
      );
      return res.status(401).send({ message: "Unauthorized" });
    }
    try {
      const data = await userController.userLogin(req);
      return res.status(data.statusCode).json(data);
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      return res.status(errorMessage.statusCode).send(errorMessage);
    }
  }
);

/**
 * User Logout API (Method DELETE)
 */
router.delete("/users/sessions",
  RateLimitMiddleware,
  isEmptyRequest,
  AccessTokenAuthGuard,
  validateEmail,
  async (req, res) => {
  req["processTimer"] = processTimer;
  req["apiTimer"] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();
  // validate req app-id
  const valAppID = validationService.validateAppID(req.headers);
  if (!valAppID) {
    req.apiTimer.end(
      "Route CIAM Logout User Error 401 Unauthorized",
      startTimer
    );
    return res.status(401).send({ message: "Unauthorized" });
  }
  let accessToken =
    req.headers && req.headers.authorization
       ? req.headers.authorization.toString()
       : "";
  if (accessToken && res.newAccessToken) {
     accessToken = res.newAccessToken;
  }
  try {
    const data = await userController.userLogout(
      accessToken,
      req.body
    );
    return res.status(data.statusCode).json(data);
  } catch (error) {
    const errorMessage = JSON.parse(error.message);
    return res.status(errorMessage.statusCode).send(errorMessage);
  }
});

/**
 * User Request Reset Password API (Method POST)
 */
router.post(
  "/users/reset-password",
  RateLimitMiddleware,
  isEmptyRequest,
  validateEmail,
  lowercaseTrimKeyValueString,
  async (req, res) => {
    req["processTimer"] = processTimer;
    req["apiTimer"] = req.processTimer.apiRequestTimer(true); // log time durations
    const startTimer = process.hrtime();
    // validate req app-id
    const valAppID = validationService.validateAppID(req.headers);
    if (!valAppID) {
      req.apiTimer.end(
        "Route CIAM Reset Password User Error 401 Unauthorized",
        startTimer
      );
      return res
        .status(401)
        .send(CommonErrors.UnauthorizedException(req.body.language));
    }

    try {
      const data = await userController.userResetPassword(req);
      return res.status(data.statusCode).json(data);
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      return res.status(errorMessage.statusCode).send(errorMessage);
    }
  }
);

/**
 * User Validate Reset Password API (Method GET)
 */
router.get("/users/reset-password", async (req, res) => {
  req["processTimer"] = processTimer;
  req["apiTimer"] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();
  // validate req app-id
  const valAppID = validationService.validateAppID(req.headers);
  if (!valAppID) {
    req.apiTimer.end(
      "Route CIAM Validate Reset Password User Error 401 Unauthorized",
      startTimer
    );
    return res
      .status(401)
      .send(CommonErrors.UnauthorizedException(req.query.language));
  }

  try {
    const data = await userController.userValidateResetPassword(
      req.query.passwordToken,
      req.query.language
    );
    return res.status(data.statusCode).json(data);
  } catch (error) {
    const errorMessage = JSON.parse(error.message);
    return res.status(errorMessage.statusCode).send(errorMessage);
  }
});

/**
 * User Confirm Reset Password API (Method PUT)
 */
router.put("/users/reset-password", isEmptyRequest, async (req, res) => {
  req["processTimer"] = processTimer;
  req["apiTimer"] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();
  // validate req app-id
  const valAppID = validationService.validateAppID(req.headers);
  if (!valAppID) {
    req.apiTimer.end(
      "Route CIAM Confirm Reset Password User Error 401 Unauthorized",
      startTimer
    );
    return res
      .status(401)
      .send(CommonErrors.UnauthorizedException(req.body.language));
  }

  try {
    const data = await userController.userConfirmResetPassword(req.body);
    return res.status(data.statusCode).json(data);
  } catch (error) {
    const errorMessage = JSON.parse(error.message);
    return res.status(errorMessage.statusCode).send(errorMessage);
  }
});

/**
 * User Get Membership Passes API (Method POST)
 */
router.post(
  "/users/membership-passes",
  RateLimitMiddleware,
  isEmptyRequest,
  AccessTokenAuthGuard,
  lowercaseTrimKeyValueString,
  async (req, res) => {
    req["processTimer"] = processTimer;
    req["apiTimer"] = req.processTimer.apiRequestTimer(true); // log time durations
    const startTimer = process.hrtime();
    // validate req app-id
    const valAppID = validationService.validateAppID(req.headers);
    if (!valAppID) {
      req.apiTimer.end(
        "Route CIAM Get Membership Passes Error 401 Unauthorized",
        startTimer
      );
      return res
        .status(401)
        .send(CommonErrors.UnauthorizedException(req.body.language));
    }

    try {
      const data = await userController.userGetMembershipPasses(req.body);
      if (res.newAccessToken) {
        data.membership.accessToken = res.newAccessToken;
      }
      return res.status(data.statusCode).json(data);
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      return res.status(errorMessage.statusCode).send(errorMessage);
    }
  }
);

/**
 * User Verify Access Token API (Method POST)
 */
router.post("/token/verify", RateLimitMiddleware, isEmptyRequest, async (req, res) => {
  req["processTimer"] = processTimer;
  req["apiTimer"] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();
  //validate req app-id
  const valAppID = validationService.validateAppID(req.headers);
  if (!valAppID) {
    req.apiTimer.end(
      "Route CIAM Verify Token Error 401 Unauthorized",
      startTimer
    );
    return res
      .status(401)
      .send(CommonErrors.UnauthorizedException(req.body.language));
  }
  if (req.headers && !req.headers.authorization) {
    req.apiTimer.end(
      "Route CIAM Verify Token Error 401 Unauthorized",
      startTimer
    );
    return res
      .status(401)
      .send(CommonErrors.UnauthorizedException(req.body.language));
  }
  const accessToken = req.headers.authorization.toString();
  try {
    const data = await userController.userVerifyToken(accessToken, req.body);
    return res.status(data.statusCode).json(data);
  } catch (error) {
    const errorMessage = JSON.parse(error.message);
    return res.status(errorMessage.statusCode).send(errorMessage);
  }
});

/**
 * API - Create Membership Pass
 */
router.post(
  "/users/my-membership",
  isEmptyRequest,
  validateEmail,
  lowercaseTrimKeyValueString,
  userController.userCreateMembershipPass
);

/**
 * API - Update Membership Pass
 */
router.put(
  "/users/my-membership",
  RateLimitMiddleware,
  isEmptyRequest,
  validateEmail,
  lowercaseTrimKeyValueString,
  userController.userUpdateMembershipPass
);

/**
 * CIAM user refresh token endpoint
 */
router.post(
  "/token/refresh",
  RateLimitMiddleware,
  isEmptyRequest,
  validateAPIKey,
  AccessTokenAuthGuard,
  async (req, res) => {
    req["processTimer"] = processTimer;
    req["apiTimer"] = req.processTimer.apiRequestTimer(true); // log time durations
    const accessToken = res.newAccessToken ? res.newAccessToken : req.headers.authorization.toString();
    try {
      loggerService.log(
        {
          user: {
            action: "Router",
            url: "/token/refresh",
            api_header: {
                ...req.headers,
                authorization: maskKeyRandomly(req.headers.authorization)
            },
            api_body: req.body,
          },
        },
        "[CIAM] userRefreshAccessToken Start Request"
      );
      const data = await userController.userRefreshAccessToken(accessToken, req);
      const loggerData = {...data};
      if (res.newAccessToken) {
        data.token.accessToken = res.newAccessToken;
        Object.assign(loggerData, { token: { ...data.token, accessToken: maskKeyRandomly(res.newAccessToken) }})
      }
      loggerService.log(
        {
          user: {
            action: "Router",
            url: "/token/refresh",
            response_to_client: JSON.stringify(loggerData),
          },
        },
        "[CIAM-MAIN] userRefreshAccessToken Success"
      );
      return res.status(data.statusCode).json(data);
    } catch (error) {
       loggerService.error(
        {
            user: {
                action: "Router",
                url: "/token/refresh",
                response_to_client: new Error(error),
            },
        },
        {url: "/token/refresh"},
        "[CIAM] userRefreshAccessToken End Request - Failed"
      );
      const errorMessage = JSON.parse(error.message);
      return res.status(errorMessage.statusCode).send(errorMessage);
    }
  }
);

module.exports = router;
