require('dotenv').config();
const express = require('express');
const router = express.Router();

const userController = require('./usersContollers');
const commonService = require('../../services/commonService');
const validationService = require('../../services/validationService');
const {
  isEmptyRequest,
  validateEmail,
  AccessTokenAuthGuard,
  AccessTokenAuthGuardByAppIdGroupFOSeries,
  lowercaseTrimKeyValueString,
  validateAPIKey,
} = require('../../middleware/validationMiddleware');
const userConfig = require('../../config/usersConfig');
const processTimer = require('../../utils/processTimer');
const crypto = require('crypto');
const uuid = crypto.randomUUID();
const { GROUP, GROUPS_SUPPORTS } = require('../../utils/constants');
const CommonErrors = require('../../config/https/errors/commonErrors');
const loggerService = require('../../logs/logger');
const { maskKeyRandomly } = require('../../utils/common');
const { safeJsonParse } = require('./myAccount/passwordless/passwordlessSendCodeHelpers');
const { serializeError } = require('../../utils/errorHandler');
const userSignupHelpers = require('./usersSignupHelper');

const pong = { pong: 'pang' };

router.use(express.json());

/**
 * @openapi
 * /v1/ciam/ping:
 *   get:
 *     summary: Health check
 *     description: Simple health check endpoint to verify the API is running
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PingResponse'
 */
router.get('/ping', async (req, res) => {
  return res.json(pong);
});

/**
 * @openapi
 * /v1/ciam/users:
 *   post:
 *     summary: User signup
 *     description: Create a new CIAM user account. Supports both WildPass and Membership Passes user groups.
 *     tags: [Users]
 *     security:
 *       - AppId: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserSignupRequest'
 *           example:
 *             email: "user@example.com"
 *             password: "SecurePass123!"
 *             firstName: "John"
 *             lastName: "Doe"
 *             group: "membership-passes"
 *             phoneNumber: "+6591234567"
 *             newletter: true
 *     responses:
 *       200:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSignupResponse'
 *       400:
 *         description: Bad request - invalid parameters or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - invalid or missing app-id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 */
router.post(
  '/users',
  isEmptyRequest,
  validateEmail,
  lowercaseTrimKeyValueString,
  async (req, res) => {
    req['processTimer'] = processTimer;
    req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations
    const startTimer = process.hrtime();

    // validate req app-id
    const valAppID = validationService.validateAppID(req.headers);
    if (!valAppID) {
      req.apiTimer.end('Route CIAM Signup User Error Unauthorized', startTimer);
      return res.status(401).send(CommonErrors.UnauthorizedException(req.body.language));
    }

    if (!req.body.group || !GROUPS_SUPPORTS.includes(req.body.group)) {
      return res
        .status(400)
        .json(CommonErrors.BadRequest('group', 'group_invalid', req.body.language));
    }

    //#region Signup Membership Passes
    if ([GROUP.MEMBERSHIP_PASSES].includes(req.body.group)) {
      try {
        const signupRs = await userController.adminCreateMPUser(req);
        req.apiTimer.end('Route CIAM Signup New User Success', startTimer);
        return res.status(signupRs.statusCode).send(signupRs);
      } catch (error) {
        req.apiTimer.end('Route CIAM Signup New User Error', startTimer);

        // Log full error details server-side for debugging
        loggerService.error(
          {
            user: {
              action: 'adminCreateMPUser',
              error: serializeError(error),
            },
          },
          '[CIAM] Signup MP User Failed',
        );

        const errorMessage = safeJsonParse(error.message);
        if (errorMessage) {
          return res.status(errorMessage.statusCode || 500).json(errorMessage);
        }

        // Return sanitized error without stack trace in production
        return res.status(error.statusCode || 500).json({
          status: 'failed',
          statusCode: error.statusCode || 500,
          error: {
            code: error.code || error.statusCode || 500,
            message: error.message || 'An error occurred during signup',
            // Only include details in non-production environments
            ...(process.env.APP_ENV !== 'prod' && { details: serializeError(error) }),
          },
        });
      }
    }
    //#endregion

    //#region Signup Wildpass
    // validate request params is listed, NOTE: listedParams doesn't have email
    const listedParams = commonService.mapCognitoJsonObj(
      userConfig.WILDPASS_SOURCE_COGNITO_MAPPING,
      req.body,
    );

    if (commonService.isJsonNotEmpty(listedParams) === false) {
      return res.status(400).json({ error: 'Bad Requests' });
    }

    req.body.uuid = uuid;

    try {
      let newUser = await userController.adminCreateUser(req);

      req.apiTimer.end('Route CIAM Signup User', startTimer);

      if (newUser.error) {
        // Log error details in server
        loggerService.error(
          {
            user: {
              action: 'adminCreateUser',
              error: newUser.error,
            },
          },
          '[CIAM] Signup User Failed',
        );

        return res.status(400).json({
          status: 'failed',
          statusCode: 400,
          error: {
            code: 400,
            message: typeof newUser.error === 'string' ? newUser.error : 'Signup failed',
          },
        });
      }

      if (userSignupHelpers.isErrorResponse(newUser)) {
        return userSignupHelpers.handleSignupError(
          newUser.error || newUser,
          'adminCreateUser',
          res,
          newUser.statusCode || newUser.code || 400,
        );
      }

      if ('membership' in newUser && 'code' in newUser.membership) {
        return res.status(newUser.membership.code).json(newUser);
      }

      return res.status(200).json(newUser);
    } catch (error) {
      req.apiTimer.end('Route CIAM Signup User Error', startTimer);

      // Log full error server-side
      loggerService.error(
        {
          user: {
            action: 'adminCreateUser',
            error: serializeError(error),
          },
        },
        '[CIAM] Signup User Exception',
      );

      return res.status(500).send(CommonErrors.InternalServerError());
    }

    //#endregion
  },
);

/**
 * @openapi
 * /v1/ciam/users:
 *   put:
 *     summary: Update user info
 *     description: Update user profile information. Requires authentication for membership-passes group when accessed via AEM.
 *     tags: [Users]
 *     security:
 *       - AppId: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdateRequest'
 *           example:
 *             email: "user@example.com"
 *             group: "membership-passes"
 *             firstName: "John"
 *             lastName: "Smith"
 *             phoneNumber: "+6591234567"
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Bad request - invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 */
router.put(
  '/users',
  isEmptyRequest,
  validateEmail,
  AccessTokenAuthGuardByAppIdGroupFOSeries,
  lowercaseTrimKeyValueString,
  async (req, res) => {
    req['processTimer'] = processTimer;
    req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations
    req.body.uuid = uuid;
    const startTimer = process.hrtime();

    // validate req app-id
    const valAppID = validationService.validateAppID(req.headers);
    if (!valAppID) {
      req.apiTimer.end('Route CIAM Update User Error 401 Unauthorized', startTimer);
      return res.status(401).send(CommonErrors.UnauthorizedException(req.body.language));
    }

    if (!req.body.group || !GROUPS_SUPPORTS.includes(req.body.group)) {
      return res
        .status(400)
        .json(CommonErrors.BadRequest('group', 'group_invalid', req.body.language));
    }
    // region Update Account Membership Passes
    if ([GROUP.MEMBERSHIP_PASSES].includes(req.body.group)) {
      try {
        const updateRs = await userController.adminUpdateMPUser(req);
        if (res.newAccessToken) {
          updateRs.membership.accessToken = res.newAccessToken;
        }
        req.apiTimer.end('Route CIAM Update New User Success', startTimer);
        return res.status(updateRs.statusCode).send(updateRs);
      } catch (error) {
        req.apiTimer.end('Route CIAM Update New User Error', startTimer);
        const errorMessage = JSON.parse(error.message);
        return res.status(errorMessage.statusCode).send(errorMessage);
      }
    }
    //#endregion

    // clean the request data for possible white space
    req['body'] = commonService.cleanData(req.body);
    // validate request params is listed, NOTE: listedParams doesn't have email
    var listedParams = commonService.mapCognitoJsonObj(
      userConfig.WILDPASS_SOURCE_COGNITO_MAPPING,
      req.body,
    );

    if (commonService.isJsonNotEmpty(listedParams) === false) {
      return res.status(400).json({ error: 'Bad Requests' });
    }

    if (valAppID === true) {
      let updateUser = await userController.adminUpdateUser(req, listedParams);

      req.apiTimer.end('Route CIAM Update User ', startTimer);
      if ('membership' in updateUser && 'code' in updateUser.membership) {
        return res.status(updateUser.membership.code).json(updateUser);
      }
      return res.status(200).json(updateUser);
    } else {
      req.apiTimer.end('Route CIAM Update User Error Unauthorized', startTimer);
      return res.status(401).send({ error: 'Unauthorized' });
    }
  },
);

/**
 * @openapi
 * /v1/ciam/users/memberships/resend:
 *   post:
 *     summary: Resend WildPass
 *     description: Resend the WildPass digital pass to the user's email
 *     tags: [Memberships]
 *     security:
 *       - AppId: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResendMembershipRequest'
 *           example:
 *             email: "user@example.com"
 *     responses:
 *       200:
 *         description: WildPass resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: WildPass resent successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 */
router.post('/users/memberships/resend', isEmptyRequest, validateEmail, async (req, res) => {
  req['processTimer'] = processTimer;
  req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();

  // validate req app-id
  var valAppID = validationService.validateAppID(req.headers);

  if (valAppID === true) {
    let resendUser = await userController.membershipResend(req);

    req.apiTimer.end('Route CIAM Resend Membership ', startTimer);
    return res.status(200).json(resendUser);
  } else {
    req.apiTimer.end('Route CIAM Resend Membership Error 401 Unauthorized', startTimer);
    return res.status(401).send({ error: 'Unauthorized' });
  }
});

/**
 * @openapi
 * /v1/ciam/users/delete:
 *   post:
 *     summary: Delete user
 *     description: Delete user from Cognito and database. Only available in dev/UAT environments.
 *     tags: [Users]
 *     security:
 *       - AppId: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserDeleteRequest'
 *           example:
 *             email: "user@example.com"
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deleteMember:
 *                   type: object
 *                   description: Deletion result
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       501:
 *         description: Not implemented (in production)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Not Implemented
 */
router.post('/users/delete', isEmptyRequest, validateEmail, async (req, res) => {
  req['processTimer'] = processTimer;
  req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();

  // validate req app-id
  var valAppID = validationService.validateAppID(req.headers);
  if (valAppID === true) {
    // allow dev, uat & prod to call. Prod will disable, no deletion
    if (['dev', 'uat', 'prod'].includes(process.env.APP_ENV)) {
      let deleteMember = await userController.membershipDelete(req);

      req.apiTimer.end('Route CIAM Delete User', startTimer);
      return res.status(200).json({ deleteMember });
    } else {
      req.apiTimer.end('Route CIAM Delete User Error 501 Not Implemented', startTimer);
      return res.status(501).json({ error: 'Not Implemented' });
    }
  } else {
    req.apiTimer.end('Route CIAM Delete User Error 401 Unauthorized', startTimer);
    return res.status(401).send({ error: 'Unauthorized' });
  }
});

/**
 * @openapi
 * /v1/ciam/users:
 *   get:
 *     summary: Get user by email
 *     description: Retrieve user information by email address
 *     tags: [Users]
 *     security:
 *       - AppId: []
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User's email address
 *         example: user@example.com
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 */
router.get('/users', isEmptyRequest, validateEmail, async (req, res) => {
  req['processTimer'] = processTimer;
  req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();

  // validate req app-id
  const valAppID = validationService.validateAppID(req.headers);

  if (valAppID === true) {
    let getUser = await userController.getUser(req);

    req.apiTimer.end('Route CIAM Get User', startTimer);
    return res.status(200).json(getUser);
  } else {
    req.apiTimer.end('Route CIAM Get User Error 401 Unauthorized', startTimer);
    return res.status(401).send({ error: 'Unauthorized' });
  }
});

/**
 * @openapi
 * /v1/ciam/users/sessions:
 *   post:
 *     summary: User login
 *     description: Authenticate user with email and password. Returns JWT tokens on success.
 *     tags: [Auth]
 *     security:
 *       - AppId: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: "user@example.com"
 *             password: "SecurePass123!"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Unauthorized - invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalServerError'
 */
router.post('/users/sessions', isEmptyRequest, validateEmail, async (req, res) => {
  req['processTimer'] = processTimer;
  req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();
  // validate req app-id
  const valAppID = validationService.validateAppID(req.headers);
  if (!valAppID) {
    req.apiTimer.end('Route CIAM Login User Error 401 Unauthorized', startTimer);
    return res.status(401).send({ message: 'Unauthorized' });
  }
  try {
    const data = await userController.userLogin(req);
    return res.status(data.statusCode).json(data);
  } catch (error) {
    const errorMessage = safeJsonParse(error.message);
    if (errorMessage) {
      return res.status(errorMessage.statusCode || 500).json(errorMessage);
    }

    return res.status(error.statusCode || 500).json({
      status: 'failed',
      statusCode: error.statusCode || 500,
      error: {
        code: error.code || error.statusCode || 500,
        message: error.message,
        ...{ details: serializeError(error) },
      },
    });
  }
});

/**
 * @openapi
 * /v1/ciam/users/sessions:
 *   delete:
 *     summary: User logout
 *     description: Logout the currently authenticated user. Invalidates the access token.
 *     tags: [Auth]
 *     security:
 *       - AppId: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LogoutRequest'
 *           example:
 *             email: "user@example.com"
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LogoutResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 */
router.delete(
  '/users/sessions',
  isEmptyRequest,
  validateEmail,
  AccessTokenAuthGuard,
  async (req, res) => {
    req['processTimer'] = processTimer;
    req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations
    const startTimer = process.hrtime();
    // validate req app-id
    const valAppID = validationService.validateAppID(req.headers);
    if (!valAppID) {
      req.apiTimer.end('Route CIAM Logout User Error 401 Unauthorized', startTimer);
      return res.status(401).send({ message: 'Unauthorized' });
    }
    let accessToken =
      req.headers && req.headers.authorization ? req.headers.authorization.toString() : '';
    if (accessToken && res.newAccessToken) {
      accessToken = res.newAccessToken;
    }
    try {
      const data = await userController.userLogout(accessToken, req.body);
      return res.status(data.statusCode).json(data);
    } catch (error) {
      const errorMessage = safeJsonParse(error.message);
      if (errorMessage) {
        return res.status(errorMessage.statusCode || 500).json(errorMessage);
      }

      return res.status(error.statusCode || 500).json({
        status: 'failed',
        statusCode: error.statusCode || 500,
        error: {
          code: error.code || error.statusCode || 500,
          message: error.message,
          ...{ details: serializeError(error) },
        },
      });
    }
  },
);

/**
 * @openapi
 * /v1/ciam/users/reset-password:
 *   post:
 *     summary: Request password reset
 *     description: Send a password reset email to the user
 *     tags: [Passwords]
 *     security:
 *       - AppId: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *           example:
 *             email: "user@example.com"
 *     responses:
 *       200:
 *         description: Password reset email sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResetPasswordResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *   get:
 *     summary: Validate reset token
 *     description: Validate the password reset token from the email link
 *     tags: [Passwords]
 *     security:
 *       - AppId: []
 *     parameters:
 *       - in: query
 *         name: passwordToken
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           enum: [en, ja, kr, zh]
 *         description: Language for error messages
 *     responses:
 *       200:
 *         description: Token validation result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidateResetTokenResponse'
 *       401:
 *         description: Unauthorized or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *   put:
 *     summary: Confirm password reset
 *     description: Set a new password using the reset token
 *     tags: [Passwords]
 *     security:
 *       - AppId: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConfirmResetPasswordRequest'
 *           example:
 *             passwordToken: "abc123def456"
 *             password: "NewSecurePass123!"
 *             confirmPassword: "NewSecurePass123!"
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConfirmResetPasswordResponse'
 *       401:
 *         description: Unauthorized or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 */
router.post(
  '/users/reset-password',
  isEmptyRequest,
  validateEmail,
  lowercaseTrimKeyValueString,
  async (req, res) => {
    req['processTimer'] = processTimer;
    req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations
    const startTimer = process.hrtime();
    // validate req app-id
    const valAppID = validationService.validateAppID(req.headers);
    if (!valAppID) {
      req.apiTimer.end('Route CIAM Reset Password User Error 401 Unauthorized', startTimer);
      return res.status(401).send(CommonErrors.UnauthorizedException(req.body.language));
    }

    try {
      const data = await userController.userResetPassword(req);
      return res.status(data.statusCode).json(data);
    } catch (error) {
      const errorMessage = safeJsonParse(error.message);
      if (errorMessage) {
        return res.status(errorMessage.statusCode || 500).json(errorMessage);
      }

      return res.status(error.statusCode || 500).json({
        status: 'failed',
        statusCode: error.statusCode || 500,
        error: {
          code: error.code || error.statusCode || 500,
          message: error.message,
          ...{ details: serializeError(error) },
        },
      });
    }
  },
);

/**
 * User Validate Reset Password API (Method GET)
 */
router.get('/users/reset-password', async (req, res) => {
  req['processTimer'] = processTimer;
  req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();
  // validate req app-id
  const valAppID = validationService.validateAppID(req.headers);
  if (!valAppID) {
    req.apiTimer.end('Route CIAM Validate Reset Password User Error 401 Unauthorized', startTimer);
    return res.status(401).send(CommonErrors.UnauthorizedException(req.query.language));
  }

  try {
    const data = await userController.userValidateResetPassword(
      req.query.passwordToken,
      req.query.language,
    );
    return res.status(data.statusCode).json(data);
  } catch (error) {
    const errorMessage = safeJsonParse(error.message);
    if (errorMessage) {
      return res.status(errorMessage.statusCode || 500).json(errorMessage);
    }

    return res.status(error.statusCode || 500).json({
      status: 'failed',
      statusCode: error.statusCode || 500,
      error: {
        code: error.code || error.statusCode || 500,
        message: error.message,
        ...{ details: serializeError(error) },
      },
    });
  }
});

/**
 * User Confirm Reset Password API (Method PUT)
 */
router.put('/users/reset-password', isEmptyRequest, async (req, res) => {
  req['processTimer'] = processTimer;
  req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();
  // validate req app-id
  const valAppID = validationService.validateAppID(req.headers);
  if (!valAppID) {
    req.apiTimer.end('Route CIAM Confirm Reset Password User Error 401 Unauthorized', startTimer);
    return res.status(401).send(CommonErrors.UnauthorizedException(req.body.language));
  }

  try {
    const data = await userController.userConfirmResetPassword(req.body);
    return res.status(data.statusCode).json(data);
  } catch (error) {
    const errorMessage = safeJsonParse(error.message);
    if (errorMessage) {
      return res.status(errorMessage.statusCode || 500).json(errorMessage);
    }

    return res.status(error.statusCode || 500).json({
      status: 'failed',
      statusCode: error.statusCode || 500,
      error: {
        code: error.code || error.statusCode || 500,
        message: error.message,
        ...{ details: serializeError(error) },
      },
    });
  }
});

/**
 * @openapi
 * /v1/ciam/users/membership-passes:
 *   post:
 *     summary: Get membership passes
 *     description: Retrieve all membership passes for the authenticated user
 *     tags: [Memberships]
 *     security:
 *       - AppId: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MembershipPassesRequest'
 *           example:
 *             email: "user@example.com"
 *     responses:
 *       200:
 *         description: Membership passes retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MembershipPassesResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 */
router.post(
  '/users/membership-passes',
  isEmptyRequest,
  AccessTokenAuthGuard,
  lowercaseTrimKeyValueString,
  async (req, res) => {
    req['processTimer'] = processTimer;
    req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations
    const startTimer = process.hrtime();
    // validate req app-id
    const valAppID = validationService.validateAppID(req.headers);
    if (!valAppID) {
      req.apiTimer.end('Route CIAM Get Membership Passes Error 401 Unauthorized', startTimer);
      return res.status(401).send(CommonErrors.UnauthorizedException(req.body.language));
    }

    try {
      const data = await userController.userGetMembershipPasses(req.body);
      if (res.newAccessToken) {
        data.membership.accessToken = res.newAccessToken;
      }
      return res.status(data.statusCode).json(data);
    } catch (error) {
      const errorMessage = safeJsonParse(error.message);
      if (errorMessage) {
        return res.status(errorMessage.statusCode || 500).json(errorMessage);
      }

      return res.status(error.statusCode || 500).json({
        status: 'failed',
        statusCode: error.statusCode || 500,
        error: {
          code: error.code || error.statusCode || 500,
          message: error.message,
          ...{ details: serializeError(error) },
        },
      });
    }
  },
);

/**
 * @openapi
 * /v1/ciam/token/verify:
 *   post:
 *     summary: Verify access token
 *     description: Verify if the provided access token is valid
 *     tags: [Tokens]
 *     security:
 *       - AppId: []
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TokenVerifyRequest'
 *     responses:
 *       200:
 *         description: Token verification result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenVerifyResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 */
router.post('/token/verify', isEmptyRequest, async (req, res) => {
  req['processTimer'] = processTimer;
  req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();
  //validate req app-id
  const valAppID = validationService.validateAppID(req.headers);
  if (!valAppID) {
    req.apiTimer.end('Route CIAM Verify Token Error 401 Unauthorized', startTimer);
    return res.status(401).send(CommonErrors.UnauthorizedException(req.body.language));
  }
  if (req.headers && !req.headers.authorization) {
    req.apiTimer.end('Route CIAM Verify Token Error 401 Unauthorized', startTimer);
    return res.status(401).send(CommonErrors.UnauthorizedException(req.body.language));
  }
  const accessToken = req.headers.authorization.toString();
  try {
    const data = await userController.userVerifyToken(accessToken, req.body);
    return res.status(data.statusCode).json(data);
  } catch (error) {
    const errorMessage = safeJsonParse(error.message);
    if (errorMessage) {
      return res.status(errorMessage.statusCode || 500).json(errorMessage);
    }

    return res.status(error.statusCode || 500).json({
      status: 'failed',
      statusCode: error.statusCode || 500,
      error: {
        code: error.code || error.statusCode || 500,
        message: error.message,
        ...{ details: serializeError(error) },
      },
    });
  }
});

/**
 * @openapi
 * /v1/ciam/users/my-membership:
 *   post:
 *     summary: Create membership pass
 *     description: Create a new membership pass for the user
 *     tags: [Memberships]
 *     security:
 *       - AppId: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMembershipPassRequest'
 *           example:
 *             email: "user@example.com"
 *             passType: "annual"
 *     responses:
 *       200:
 *         description: Membership pass created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MembershipPassesResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *   put:
 *     summary: Update membership pass
 *     description: Update an existing membership pass
 *     tags: [Memberships]
 *     security:
 *       - AppId: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMembershipPassRequest'
 *           example:
 *             email: "user@example.com"
 *             passType: "premium"
 *     responses:
 *       200:
 *         description: Membership pass updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MembershipPassesResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 */
router.post(
  '/users/my-membership',
  isEmptyRequest,
  validateEmail,
  lowercaseTrimKeyValueString,
  userController.userCreateMembershipPass,
);

router.put(
  '/users/my-membership',
  isEmptyRequest,
  validateEmail,
  lowercaseTrimKeyValueString,
  userController.userUpdateMembershipPass,
);

/**
 * @openapi
 * /v1/ciam/token/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Get a new access token using the refresh token. Requires valid access token in Authorization header.
 *     tags: [Tokens]
 *     security:
 *       - AppId: []
 *       - ApiKey: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TokenRefreshRequest'
 *           example:
 *             email: "user@example.com"
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenRefreshResponse'
 *       401:
 *         description: Unauthorized - invalid token or API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 */
router.post(
  '/token/refresh',
  isEmptyRequest,
  validateAPIKey,
  AccessTokenAuthGuard,
  async (req, res) => {
    req['processTimer'] = processTimer;
    req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations
    const accessToken = res.newAccessToken
      ? res.newAccessToken
      : req.headers.authorization.toString();
    try {
      loggerService.log(
        {
          user: {
            action: 'Router',
            url: '/token/refresh',
            api_header: {
              ...req.headers,
              authorization: maskKeyRandomly(req.headers.authorization),
            },
            api_body: req.body,
          },
        },
        '[CIAM] userRefreshAccessToken Start Request',
      );
      const data = await userController.userRefreshAccessToken(accessToken, req);
      const loggerData = { ...data };
      if (res.newAccessToken) {
        data.token.accessToken = res.newAccessToken;
        Object.assign(loggerData, {
          token: { ...data.token, accessToken: maskKeyRandomly(res.newAccessToken) },
        });
      }
      loggerService.log(
        {
          user: {
            action: 'Router',
            url: '/token/refresh',
            response_to_client: JSON.stringify(loggerData),
          },
        },
        '[CIAM-MAIN] userRefreshAccessToken Success',
      );
      return res.status(data.statusCode).json(data);
    } catch (error) {
      loggerService.error(
        {
          user: {
            action: 'Router',
            url: '/token/refresh',
            response_to_client: new Error(error),
          },
        },
        { url: '/token/refresh' },
        '[CIAM] userRefreshAccessToken End Request - Failed',
      );
      const errorMessage = safeJsonParse(error.message);
      if (errorMessage) {
        return res.status(errorMessage.statusCode || 500).json(errorMessage);
      }

      return res.status(error.statusCode || 500).json({
        status: 'failed',
        statusCode: error.statusCode || 500,
        error: {
          code: error.code || error.statusCode || 500,
          message: error.message,
          ...{ details: serializeError(error) },
        },
      });
    }
  },
);

module.exports = router;
