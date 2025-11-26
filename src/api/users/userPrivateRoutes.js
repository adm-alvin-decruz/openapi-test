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
  validateId,
} = require('../../middleware/validationMiddleware');
const userConfig = require('../../config/usersConfig');
const processTimer = require('../../utils/processTimer');
const crypto = require('crypto');
const uuid = crypto.randomUUID();
const { GROUP, GROUPS_SUPPORTS } = require('../../utils/constants');
const CommonErrors = require('../../config/https/errors/commonErrors');
const userModel = require('../../db/models/userModel');
const { formatDateToMySQLDateTime } = require('../../utils/dateUtils');

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
    const listedParams = commonService.mapCognitoJsonObj(
      userConfig.WILDPASS_SOURCE_COGNITO_MAPPING,
      req.body,
    );

    if (commonService.isJsonNotEmpty(listedParams) === false) {
      return res.status(400).json({ error: 'Bad Requests' });
    }

    try {
      const updateUser = await userController.adminUpdateUser(req, listedParams);

      req.apiTimer.end('Route CIAM Update User ', startTimer);
      if ('membership' in updateUser && 'code' in updateUser.membership) {
        return res.status(updateUser.membership.code).json(updateUser);
      }
      return res.status(200).json(updateUser);
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      res.status(501).send(CommonErrors.NotImplemented());
    }
  },
);

/**
 * CIAM Update user - Private endpoint
 * PATCH /private/v1/users/:id/otp-email/disable  
 */
router.patch(
  '/v1/users/:id/otp-email/disable',
  validateAPIKey,
  validateId,
  async (req, res) => {
    req['processTimer'] = processTimer;
    req['apiTimer'] = req.processTimer.apiRequestTimer(true);
    const startTimer = process.hrtime();
    req.apiTimer.start('Route CIAM Update User - Suppress OTP email', startTimer);

    try {
      const { id: userId, email } = await userModel.findById(req.params.id);
      if (!userId || !email) {
        req.apiTimer.end('Route CIAM Update User Error - User not found', startTimer);
        return res.status(404).json({ msg: 'User not found' });
      }

      // Update user
      let disabledUntilDate = new Date();
      disabledUntilDate.setMinutes(disabledUntilDate.getMinutes() + 5);
      const otpEmailDisabledUntil = formatDateToMySQLDateTime(disabledUntilDate);
      const updateResult = await userModel.update(userId, { otp_email_disabled_until: otpEmailDisabledUntil });

      if (!updateResult.success) {
        req.apiTimer.end('Route CIAM Update User Error - Failed to suppress OTP email', startTimer);
        return res.status(500).json({ msg: 'Failed to suppress OTP email' });
      }

      req.apiTimer.end('Route CIAM Update User Success - OTP email suppressed successfully', startTimer);
      return res.status(200).json({ msg: 'OTP email suppressed successfully' });
    } catch (error) {
      req.apiTimer.end('Route CIAM Update User Error - Failed to suppress OTP email', startTimer);
      return res.status(500).json({ msg: 'Failed to suppress OTP email: ' + error.message });
    }
  },
);

module.exports = router;
