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
const { validateAndTransformOtpEmailDisabledUntil } = require('./helpers/otpEmailHelper');

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

    // Validate and transform otp_email_disabled_until to mysql format if exists
    // Works for both wildpass and membership-passes flows
    if (req.body.otpEmailDisabledUntil !== undefined) {
      const { error, value } = validateAndTransformOtpEmailDisabledUntil(
        req.body.otpEmailDisabledUntil,
        req.body.language,
      );
      
      if (error) {
        return res.status(400).json(error);
      }
      
      req.body.otpEmailDisabledUntil = value;
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

    if (commonService.isJsonNotEmpty(cognitoParams) === false) {
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

module.exports = router;
