require('dotenv').config();
const express = require('express');
const router = express.Router();

const passwordlessController = require('../passwordless/passwordlessControllers');
const validationService = require('../../../../services/validationService');
const passwordlessSendCodeService = require('./passwordlessSendCodeServices');
const processTimer = require('../../../../utils/processTimer');
const { safeJsonParse } = require('../passwordless/passwordlessSendCodeHelpers');
const { verifyTurnstile } = require('../../../../middleware/turnstileMiddleware');
const crypto = require('crypto');
const uuid = crypto.randomUUID();
const {
  isEmptyRequest,
  validateEmail,
  lowercaseTrimKeyValueString,
} = require('../../../../middleware/validationMiddleware');
const CommonErrors = require('../../../../config/https/errors/commonErrors');
const passwordlessVerifyCodeService = require('./passwordlessVerifyCodeServices');
const { serializeError } = require('../../../../utils/errorHandler');

const pong = { pong: 'pang' };

router.use(express.json());

router.get('/ping', async (req, res) => {
  return res.json(pong);
});

/**
 * CIAM MyAccount - Send OTP Email
 */
router.post(
  '/passwordless/send',
  isEmptyRequest,
  validateEmail,
  lowercaseTrimKeyValueString,
  verifyTurnstile,
  async (req, res) => {
    req['processTimer'] = processTimer;
    req['apiTimer'] = req.processTimer.apiRequestTimer(true);
    req.body.uuid = uuid;
    const startTimer = process.hrtime();

    // Validate App ID
    const valAppID = validationService.validateAppID(req.headers);
    if (!valAppID) {
      req.apiTimer.end('Route CIAM Signup User Error Unauthorized', startTimer);
      return res.status(401).send(CommonErrors.UnauthorizedException(req.body.language));
    }

    // TODO call signup job instead?

    // if (!req.body.group || !GROUPS_SUPPORTS.includes(req.body.group)) {
    //   return res
    //     .status(400)
    //     .json(
    //       CommonErrors.BadRequest("group", "group_invalid", req.body.language)
    //     );
    // }

    // //#region Signup Membership Passes
    // if ([GROUP.MEMBERSHIP_PASSES].includes(req.body.group)) {
    //   try {
    //     const signupRs = await userController.adminCreateMPUser(req);
    //     req.apiTimer.end("Route CIAM Signup New User Success", startTimer);
    //     return res.status(signupRs.statusCode).send(signupRs);
    //   } catch (error) {
    //     req.apiTimer.end("Route CIAM Signup New User Error", startTimer);
    //     const errorMessage = JSON.parse(error.message);
    //     return res.status(errorMessage.statusCode).send(errorMessage);
    //   }
    // }
    // //#endregion

    // //#region Signup Wildpass
    // // validate request params is listed, NOTE: listedParams doesn't have email
    // const listedParams = commonService.mapCognitoJsonObj(
    //   userConfig.WILDPASS_SOURCE_COGNITO_MAPPING,
    //   req.body
    // );

    // if (commonService.isJsonNotEmpty(listedParams) === false) {
    //   return res.status(400).json({ error: "Bad Requests" });
    // }
    // req.body.uuid = uuid;
    // let newUser = await userController.adminCreateUser(req);

    // req.apiTimer.end("Route CIAM Signup User", startTimer);
    // if (newUser.error) {
    //   return res.status(400).json(newUser);
    // }

    // if ("membership" in newUser && "code" in newUser.membership) {
    //   return res.status(newUser.membership.code).json(newUser);
    // }

    // //#endregion

    try {
      const toIssueChallenge = await passwordlessSendCodeService.shouldIssueChallenge(req);
      if (!toIssueChallenge.proceed) {
        req.apiTimer.end('Route CIAM Passwordless Send Denied', startTimer);
        const errObj = passwordlessSendCodeService.mapIssueChallengeFailureToError(req, toIssueChallenge.error);
        console.log(JSON.stringify(errObj));
        return res.status(errObj.statusCode || 400).json(errObj);
      }
      const otpRes = await passwordlessController.sendCode(req);

      return res.status(200).json(otpRes);
    } catch (error) {
      req.apiTimer.end('Route CIAM Passwordless Send Error', startTimer);
      console.error('Error in passwordless send:', error);

      return res.status(error.statusCode || 500).json({
        status: 'failed',
        statusCode: error.statusCode || 500,
        error: {
          code: error.code || error.statusCode || 500,
          message: error.message || 'Failed to send OTP email',
          ...(process.env.APP_ENV !== 'prod' && { details: serializeError(error) }),
        },
      });
    }
  },
);

/**
 * CIAM MyAccount - Verify OTP
 */
router.post(
  '/passwordless/session',
  isEmptyRequest,
  validateEmail,
  lowercaseTrimKeyValueString,
  async (req, res) => {
    req['processTimer'] = processTimer;
    req['apiTimer'] = req.processTimer.apiRequestTimer(true);
    const startTimer = process.hrtime();

    const valAppID = validationService.validateAppID(req.headers);
    if (!valAppID) {
      req.apiTimer.end('Route CIAM Login User Error 401 Unauthorized', startTimer);
      return res.status(401).send({ message: 'Unauthorized' });
    }

    try {
      const toVerify = await passwordlessVerifyCodeService.shouldVerify(req);
      if (!toVerify.proceed) {
        req.apiTimer.end('Route CIAM Passwordless Session Denied', startTimer);
        const errObj = passwordlessVerifyCodeService.mapVerifyFailureToError(req, toVerify.error, toVerify.isMagic);
        console.log(JSON.stringify(errObj));
        return res.status(errObj.statusCode || 400).json(errObj);
      }
      const data = await passwordlessController.verifyCode(req, toVerify.tokenId);

      return res.status(data.statusCode).json(data);
    } catch (error) {
      req.apiTimer.end('Route CIAM Passwordless Session Error', startTimer);
      console.error('Error in passwordless verify:', error);

      const errorMessage = safeJsonParse(error.message);
      if (errorMessage) {
        return res.status(errorMessage.statusCode || 500).json(errorMessage);
      }

      return res.status(error.statusCode || 500).json({
        status: 'failed',
        statusCode: error.statusCode || 500,
        error: {
          code: error.code || error.statusCode || 500,
          message: error.message || 'Failed to verify OTP',
          ...(process.env.APP_ENV !== 'prod' && { details: serializeError(error) }),
        },
      });
    }
  },
);

/**
 * CIAM MyAccount passwordless verify magic link public endpoint
 */
// router.get('/passwordless/session', lowercaseTrimKeyValueString, async (req, res) => {
//   req['processTimer'] = processTimer;
//   req['apiTimer'] = req.processTimer.apiRequestTimer(true);
//   const startTimer = process.hrtime();

//   const token = req.query?.token;
//   if (!token || !token.trim()) {
//     req.apiTimer.end('Route CIAM Magic Link Error 400 Token Missing', startTimer);
//     const errorMessage = JSON.parse(
//       JSON.stringify(passwordlessVerifyCodeHelper.getTokenError('missingToken', req, true)),
//     );
//     return res.status(errorMessage.statusCode).send(errorMessage);
//   }

//   try {
//     const decide = await defineForVerify(req);
//     if (!decide.proceed) {
//       req.apiTimer.end('Route CIAM Passwordless Session Denied', startTimer);
//       const helperKey = mapDefineReasonToHelperKey(decide.reason);
//       const isMagic = !!req.query?.token?.trim();
//       const errObj = passwordlessVerifyCodeHelper.getTokenError(helperKey, req, isMagic);

//       return res.status(errObj.statusCode || 400).json(errObj);
//     }

//     const data = await passwordlessController.verifyCode(req);
//     return res.status(data.statusCode).json(data);
//   } catch (error) {
//     const errorMessage = JSON.parse(error.message);
//     return res.status(errorMessage.statusCode).json(errorMessage);
//   }
// });

module.exports = router;
