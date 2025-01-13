require('dotenv').config()
const express = require('express');
const router = express.Router();

const processTimer = require('../../utils/processTimer');
const membershipsController = require('./membershipsControllers');
const validationService = require('../../services/validationService');
const CommonErrors = require("../../config/https/errors/common");

const pong = {'pong': 'pang'};

router.use(express.json());

router.get('/ping', async (req, res) => {
    res.json(pong);
});

/**
 * Get membership by email
 * Response
 */
router.post("/users/memberships", async (req, res) => {
  req["processTimer"] = processTimer;
  req["apiTimer"] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();
  // validate req app-id
  const valAppID = validationService.validateAppID(req.headers);
  if (!valAppID) {
    req.apiTimer.end(
        "Route CIAM Check Membership User Error 401 Unauthorized",
        startTimer
    );
    return res.status(401).send(CommonErrors.UnauthorizedException(req.body.language));
  }
  try {
    const checkMemberResult = await membershipsController.adminGetUser(req.body);
    req.apiTimer.end('Route CIAM Check Membership ended', startTimer);
    return res.status(200).send(checkMemberResult);
  } catch (error) {
    if (error.isFromAEM) {
      return res.status(200).send(error);
    }
    const errorMessage = JSON.parse(error.message);
    if (errorMessage.statusCode !== 500) {
      return res.status(errorMessage.statusCode).send(errorMessage)
    }
    return res.status(500).send(CommonErrors.InternalServerError());
  }
});

module.exports = router;
