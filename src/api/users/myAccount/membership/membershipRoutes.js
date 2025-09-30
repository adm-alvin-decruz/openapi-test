require("dotenv").config();
const express = require("express");
const router = express.Router();

const validationService = require("../../../../services/validationService");
const processTimer = require("../../../../utils/processTimer");
const { AccessTokenAuthGuard, validateEmail } = require("../../../../middleware/validationMiddleware");
const CommonErrors = require("../../../../config/https/errors/commonErrors");
const membershipsController = require("./membershipController");

router.use(express.json());

/**
 * CIAM MyAccount retrieve membership
 */
router.post("/", validateEmail, AccessTokenAuthGuard, async (req, res) => {
  req["processTimer"] = processTimer;
  req["apiTimer"] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();
  // validate req app-id
  const valAppID = validationService.validateAppID(req.headers);
  if (!valAppID) {
    req.apiTimer.end("Route CIAM Get Membership User Error 401 Unauthorized", startTimer);
    return res.status(401).send(CommonErrors.UnauthorizedException(req.body.language));
  }
  try {
    const membership = await membershipsController.retrieveMembership(req.body);
    req.apiTimer.end("Route CIAM Get Membership ended", startTimer);
    return res.status(200).send(membership);
  } catch (error) {
    const errorMessage = JSON.parse(error.message);
    if (errorMessage.statusCode !== 500) {
      return res.status(errorMessage.statusCode).json(errorMessage);
    }
    return res.status(500).send(CommonErrors.InternalServerError());
  }
});

/**
 * CIAM MyAccount delete user account
 */
router.delete("/", validateEmail, AccessTokenAuthGuard, async (req, res) => {
  req["processTimer"] = processTimer;
  req["apiTimer"] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();
  // validate req app-id
  const valAppID = validationService.validateAppID(req.headers);
  if (!valAppID) {
    req.apiTimer.end("Route CIAM Delete Membership User Error 401 Unauthorized", startTimer);
    return res.status(401).send(CommonErrors.UnauthorizedException(req.body.language));
  }
  try {
    const membership = await membershipsController.deleteUserMembership(req.body);
    req.apiTimer.end("Route CIAM Delete Membership ended", startTimer);
    return res.status(200).send(membership);
  } catch (error) {
    const errorMessage = JSON.parse(error.message);
    if (errorMessage.statusCode !== 500) {
      return res.status(errorMessage.statusCode).json(errorMessage);
    }
    return res.status(500).send(CommonErrors.InternalServerError());
  }
});

module.exports = router;
