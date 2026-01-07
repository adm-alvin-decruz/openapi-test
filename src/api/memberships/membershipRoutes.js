require('dotenv').config();
const express = require('express');
const router = express.Router();

const processTimer = require('../../utils/processTimer');
const membershipsController = require('./membershipsControllers');
const validationService = require('../../services/validationService');
const CommonErrors = require('../../config/https/errors/commonErrors');
const {
  isEmptyRequest,
  validateEmailDisposable,
} = require('../../middleware/validationMiddleware');

const pong = { pong: 'pang' };

router.use(express.json());

/**
 * @openapi
 * /v1/ciam/ping:
 *   get:
 *     summary: Health check (membership)
 *     description: Simple health check endpoint for membership service
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
  res.json(pong);
});

/**
 * @openapi
 * /v1/ciam/users/memberships:
 *   post:
 *     summary: Check membership by email
 *     description: Check if a user has an active membership by their email address
 *     tags: [Memberships]
 *     security:
 *       - AppId: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MembershipCheckRequest'
 *           example:
 *             email: "user@example.com"
 *     responses:
 *       200:
 *         description: Membership check result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MembershipCheckResponse'
 *       401:
 *         description: Unauthorized
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
router.post('/users/memberships', isEmptyRequest, validateEmailDisposable, async (req, res) => {
  req['processTimer'] = processTimer;
  req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();
  // validate req app-id
  const valAppID = validationService.validateAppID(req.headers);
  if (!valAppID) {
    req.apiTimer.end('Route CIAM Check Membership User Error 401 Unauthorized', startTimer);
    return res.status(401).send(CommonErrors.UnauthorizedException(req.body.language));
  }
  try {
    const checkMemberResult = await membershipsController.adminGetUser(req.body);
    req.apiTimer.end('Route CIAM Check Membership ended', startTimer);
    return res.status(200).send(checkMemberResult);
  } catch (error) {
    const errorMessage = JSON.parse(error.message);
    if (errorMessage.statusCode !== 500) {
      return res.status(errorMessage.statusCode).json(errorMessage);
    }
    return res.status(500).json(CommonErrors.InternalServerError());
  }
});

module.exports = router;
