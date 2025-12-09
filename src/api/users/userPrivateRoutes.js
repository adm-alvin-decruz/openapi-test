require('dotenv').config();
const express = require('express');
const router = express.Router();

const userController = require('./usersContollers');
const commonService = require('../../services/commonService');
const {
  isEmptyRequest,
  validateEmail,
  validateAPIKey,
  lowercaseTrimKeyValueString,
} = require('../../middleware/validationMiddleware');
const userConfig = require('../../config/usersConfig');
const processTimer = require('../../utils/processTimer');
const crypto = require('crypto');
const uuid = crypto.randomUUID();
const { GROUP, GROUPS_SUPPORTS } = require('../../utils/constants');
const CommonErrors = require('../../config/https/errors/commonErrors');
const loggerService = require('../../logs/logger');
const pong = { pong: 'pang' };

router.use(express.json());

router.get('/ping', async (req, res) => {
  return res.json(pong);
});

/**
 * CIAM Update user info private endpoint
 */
router.put(
  '/v1/users',
  isEmptyRequest,
  validateEmail,
  validateAPIKey,
  lowercaseTrimKeyValueString,
  async (req, res) => {
    req['processTimer'] = processTimer;
    req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations
    req.body.uuid = uuid;
    const startTimer = process.hrtime();

    if (!req.body.group || !GROUPS_SUPPORTS.includes(req.body.group)) {
      return res
        .status(400)
        .json(CommonErrors.BadRequest('group', 'group_invalid', req.body.language));
    }

    // Validate otpEmailDisabledUntil if exists (validation only)
    if (req.body.otpEmailDisabledUntil !== undefined) {
      const { validateOtpEmailDisabledUntil } = require('./helpers/otpEmailHelper');
      const validationError = validateOtpEmailDisabledUntil(req.body.otpEmailDisabledUntil, req.body.language);
      if (validationError) {
        return res.status(400).json(validationError);
      }
    }

    //#region Update Account New logic (FO series)
    if ([GROUP.MEMBERSHIP_PASSES].includes(req.body.group)) {
      try {
        req.body.privateMode = true;
        const updateRs = await userController.adminUpdateMPUser(req, '');
        req.apiTimer.end('Route CIAM Update Membership-Passes User Success', startTimer);
        return res.status(updateRs.statusCode).send(updateRs);
      } catch (error) {
        req.apiTimer.end('Route CIAM Update New User Error', startTimer);
        const errorMessage = JSON.parse(error.message);
        return res.status(errorMessage.statusCode).send(errorMessage);
      }
    }
    //#endregion

    //keep logic update for wildpass user account
    req['body'] = commonService.cleanData(req.body);
    // validate request params is listed, NOTE: listedParams doesn't have email
    const cognitoParams = commonService.mapCognitoJsonObj(
      userConfig.WILDPASS_SOURCE_COGNITO_MAPPING, 
      req.body
    );

    const databaseParams = commonService.mapCognitoJsonObj(
      userConfig.DATABASE_PARAMS_MAPPING, 
      req.body
    );

    // Allow request if there are Cognito params OR database params (e.g., otpEmailDisabledUntil)
    // This supports OTP-only updates without requiring other fields
    if (commonService.isJsonNotEmpty(cognitoParams) === false && commonService.isJsonNotEmpty(databaseParams) === false) {
      return res.status(400).json({ error: 'Bad Requests' });
    }

    try {
      const updateUser = await userController.adminUpdateUser(req, cognitoParams, databaseParams);

      req.apiTimer.end('Route CIAM Update User ', startTimer);
      if ('membership' in updateUser && 'code' in updateUser.membership) {
        return res.status(updateUser.membership.code).json(updateUser);
      }
      return res.status(200).json(updateUser);
    } catch (error) {
      loggerService.error(error);
      res.status(501).send(CommonErrors.NotImplemented());
    }
  },
);

/**
 * CIAM Get users private endpoint
 * GET /private/v1/users?email=xxx&mandaiId=xxx&page=1&limit=50&sortBy=createdAt&sortOrder=DESC
 * 
 * Supported query parameters (camelCase):
 * - email: Filter by email
 * - mandaiId: Filter by mandai ID
 * - singpassUuid: Filter by Singpass UUID
 * - status: Filter by status (0 or 1)
 * - createdAtFrom: Filter by created date from (ISO format)
 * - createdAtTo: Filter by created date to (ISO format)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 250)
 * - sortBy: Sort field (id, email, mandaiId, singpassUuid, status, createdAt, updatedAt)
 * - sortOrder: Sort order (ASC or DESC, default: DESC)
 */
router.get(
  '/v1/users',
  validateAPIKey, // Middleware: Validate API key
  async (req, res) => {
    req['processTimer'] = processTimer;
    req['apiTimer'] = req.processTimer.apiRequestTimer(true);
    const startTimer = process.hrtime();

    try {
      const result = await userController.getUsers(req);
      req.apiTimer.end('Route CIAM Get Users Success', startTimer);
      return res.status(result.statusCode).json(result);
    } catch (error) {
      req.apiTimer.end('Route CIAM Get Users Error', startTimer);
      loggerService.error('userPrivateRoutes.GET /v1/users', error);
      
      return res.status(500).json({
        status: 'failed',
        statusCode: 500,
        membership: {
          code: 500,
          mwgCode: 'MWG_CIAM_USERS_GET_ERROR',
          message: 'Get users error.',
        },
      });
    }
  }
);

module.exports = router;
