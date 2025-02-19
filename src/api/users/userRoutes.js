require("dotenv").config();
const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ limits: { fileSize: 1024 * 1024 * 1 } });

const userController = require("./usersContollers");
const commonService = require("../../services/commonService");
const validationService = require("../../services/validationService");
const {
  isEmptyRequest,
  validateEmail,
  AccessTokenAuthGuard,
  AccessTokenAuthGuardByAppIdGroupFOSeries,
} = require("../../middleware/validationMiddleware");
const userConfig = require("../../config/usersConfig");
const processTimer = require("../../utils/processTimer");
const crypto = require("crypto");
const uuid = crypto.randomUUID();
const { GROUP, GROUPS_SUPPORTS } = require("../../utils/constants");
const CommonErrors = require("../../config/https/errors/common");
const loggerService = require("../../logs/logger");

const pong = { pong: "pang" };

router.use(express.json());

router.get("/ping", async (req, res) => {
  return res.json(pong);
});

/**
 * User signup, create new CIAM user
 */
router.post("/users", isEmptyRequest, validateEmail, async (req, res) => {
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
      const signupRs = await userController.adminCreateNewUser(req);
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
router.put(
  "/users",
  isEmptyRequest,
  validateEmail,
  AccessTokenAuthGuardByAppIdGroupFOSeries,
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
    //#region Update Account New logic (FO series)
    if ([GROUP.MEMBERSHIP_PASSES].includes(req.body.group)) {
      try {
        const accessToken =
          req.headers && req.headers.authorization
            ? req.headers.authorization.toString()
            : "";
        const updateRs = await userController.adminUpdateNewUser(
          req,
          accessToken
        );
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
  upload.none(),
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
router.post(
  "/users/sessions",
  isEmptyRequest,
  validateEmail,
  async (req, res) => {
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
router.delete("/users/sessions", AccessTokenAuthGuard, async (req, res) => {
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
  const accessToken = req.headers.authorization.toString();
  try {
    const data = await userController.userLogout(
      accessToken,
      req.query.language
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
  isEmptyRequest,
  validateEmail,
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
  isEmptyRequest,
  validateEmail,
  AccessTokenAuthGuard,
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
router.post("/token/verify", isEmptyRequest, async (req, res) => {
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
 * Create Membership Pass
 * @param {JSON} req
 * @param {JSON} res
 * @returns
 */
router.post(
  "/users/my-membership",
  isEmptyRequest,
  userController.userCreateMembershipPass
);
router.put(
  "/users/my-membership",
  isEmptyRequest,
  userController.userUpdateMembershipPass
);

module.exports = router;
