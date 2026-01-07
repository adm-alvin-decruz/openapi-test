require('dotenv').config();
const express = require('express');
const router = express.Router();

const passwordlessController = require('../passwordless/passwordlessControllers');
const validationService = require('../../../../services/validationService');
const passwordlessSendCodeService = require('./passwordlessSendCodeServices');
const processTimer = require('../../../../utils/processTimer');
const { safeJsonParse } = require('../passwordless/passwordlessSendCodeHelpers');
// const { verifyTurnstile } = require('../../../../middleware/turnstileMiddleware');
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

/**
 * @openapi
 * /v2/ciam/auth/ping:
 *   get:
 *     summary: Health check (passwordless)
 *     description: Simple health check endpoint for passwordless authentication service
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
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
 * /v2/ciam/auth/passwordless/send:
 *   post:
 *     summary: Send OTP email
 *     description: Send a one-time password to the user's email for passwordless authentication
 *     tags: [Passwordless]
 *     security:
 *       - AppId: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordlessSendRequest'
 *           example:
 *             email: "user@example.com"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PasswordlessSendResponse'
 *       400:
 *         description: Bad request - rate limit exceeded or email invalid
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
  '/passwordless/send',
  isEmptyRequest,
  validateEmail,
  lowercaseTrimKeyValueString,
  // verifyTurnstile,
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

    try {
      const toIssueChallenge = await passwordlessSendCodeService.shouldIssueChallenge(req);
      if (!toIssueChallenge.proceed) {
        req.apiTimer.end('Route CIAM Passwordless Send Denied', startTimer);
        const errObj = passwordlessSendCodeService.mapIssueChallengeFailureToError(
          req,
          toIssueChallenge.error,
        );
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
 * @openapi
 * /v2/ciam/auth/passwordless/session:
 *   post:
 *     summary: Verify OTP
 *     description: Verify the one-time password and create a session. Returns JWT tokens on success.
 *     tags: [Passwordless]
 *     security:
 *       - AppId: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordlessVerifyRequest'
 *           example:
 *             email: "user@example.com"
 *             otp: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully, session created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PasswordlessVerifyResponse'
 *       400:
 *         description: Bad request - invalid or expired OTP
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
        const errObj = passwordlessVerifyCodeService.mapVerifyFailureToError(
          req,
          toVerify.error,
          toVerify.isMagic,
        );
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
