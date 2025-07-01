require('dotenv').config()
const express = require('express');
const router = express.Router();
const multer  = require('multer');
const upload = multer({ limits: {fileSize: 1024 * 1024 * 1} });

const supportController = require("./supportControllers" );
const validationService = require('../../services/validationService');
const { isEmptyRequest, validateEmail } = require('../../middleware/validationMiddleware');
const processTimer = require('../../utils/processTimer');
const CommonErrors = require("../../config/https/errors/commonErrors");
const { RateLimitMiddleware } = require("../../middleware/rateLimitMiddleware");

router.use(express.json());

// get single user (DB & cognito) data
router.get('/support/user', upload.none(), isEmptyRequest, validateEmail, async (req, res) => {
  // validate req app-id
  var valAppID = validationService.validateAppID(req.headers, 'support');

  if(valAppID === true){
    let getUser = await supportController.getUserAll(req);
    return res.status(200).json(getUser);
  }
  else{
    return res.status(401).send({ error: 'Unauthorized' });
  }
});

/** switches */
router.get('/support/switches', upload.none(), isEmptyRequest, async (req, res) => {
  // validate req app-id
  var valAppID = validationService.validateAppID(req.headers, 'support');

  if(valAppID === true){
    let getUser = await supportController.getAllSwitches();
    return res.status(200).json(getUser);
  }
  else{
    return res.status(401).send({ error: 'Unauthorized' });
  }
});

// create switches
router.post('/support/switches', async (req, res) => {
  const valAppID = validationService.validateAppID(req.headers, 'support');

  if(valAppID === true) {
    try {
      const config = await supportController.createSwitches(req.body);
      return res.status(200).json(config);
    } catch {
      return res.status(400).send({ message: 'Switches is duplicated' });
    }
  }
  else{
    return res.status(401).send(CommonErrors.UnauthorizedException());
  }
})

// update switches
router.put('/support/switches', upload.none(), isEmptyRequest, async (req, res) => {
  // validate req app-id
  var valAppID = validationService.validateAppID(req.headers, 'support');

  if(valAppID === true){
    let update = await supportController.updateSwitches(req);
    return res.status(200).json(update);
  }
  else{
    return res.status(401).send({ error: 'Unauthorized' });
  }
});

// get list of user with pagination and custom field
router.get('/support/user/list', upload.none(), isEmptyRequest, async (req, res) => {
  // validate req app-id
  var valAppID = validationService.validateAppID(req.headers, 'support');

  if(valAppID === true){
    let getUser = await supportController.getUsersPaginationCustom(req);
    return res.status(200).json(getUser);
  }
  else{
    return res.status(401).send({ error: 'Unauthorized' });
  }
});

router.post('/support/user/list', upload.none(), isEmptyRequest, async (req, res) => {
  // validate req app-id
  var valAppID = validationService.validateAppID(req.headers, 'support');

  if(valAppID === true){
    let getUser = await supportController.getUsersPaginationCustom(req);
    return res.status(200).json(getUser);
  }
  else{
    return res.status(401).send({ error: 'Unauthorized' });
  }
});

router.post('/support/user/batchpatch', upload.none(), isEmptyRequest, async (req, res) => {
  req['processTimer'] = processTimer;
  req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();

  // validate req app-id
  var valAppID = validationService.validateAppID(req.headers, 'support');

  if(valAppID === true){
    let patchUser;
    try {
      patchUser = await supportController.batchPatchUser(req);
      res.status(200).json({ success: true, affectedEmails: patchUser });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
    req.apiTimer.end('[CIAM-SUPPORT] batch patch end', startTimer);
  }
  else{
    return res.status(401).send({ error: 'Unauthorized' });
  }
});

router.get('/support/token', upload.none(), isEmptyRequest, async (req, res) => {
  req['processTimer'] = processTimer;
  req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();

  // validate req app-id
  var valAppID = validationService.validateAppID(req.headers, 'support');

  if(valAppID === true){
    let token;
    try {
      token = await supportController.getTokenByClient(req);
      res.status(200).json({ success: true, token: token });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
    req.apiTimer.end('[CIAM-SUPPORT] get token ended', startTimer);
  }
  else{
    return res.status(401).send({ error: 'Unauthorized' });
  }

});

// update token table's data
router.put('/support/token', isEmptyRequest, async (req, res) => {
  return await supportController.updateToken(req, res);
});

/** get list Support failed jobs table */
router.post('/support/failed-jobs',isEmptyRequest, async (req, res) => {
  return await supportController.getFailedJobs(req, res);
});

/** retrigger failed jobs in failed jobs table */
router.post('/support/failed-jobs/retrigger',isEmptyRequest, async (req, res) => {
  return await supportController.triggerFailedJobsCtr(req, res);
});

/** re-trigger empty visual ID due to galaxy pass import not run earlier phase1a-1 or future any errors */
router.post('/support/user/galaxy/import',isEmptyRequest, async (req, res) => {
  req.apiPath = '/support/user/galaxy/import';
  return await supportController.triggerGalaxyWPImportCtrl(req, res);
});

/** configs */
router.get('/support/configs', RateLimitMiddleware, async (req, res) => {
  // validate req app-id
  const valAppID = validationService.validateAppID(req.headers, 'support');

  if(valAppID === true) {
    try {
      const configs = await supportController.getByConfigs(req.query.config);
      return res.status(200).json(configs);
    } catch {
      return res.status(400).send({ message: 'Config is not found' });
    }
  }
  else{
    return res.status(401).send(CommonErrors.UnauthorizedException());
  }
});
router.post('/support/configs', async (req, res) => {
  // validate req app-id
  const valAppID = validationService.validateAppID(req.headers, 'support');

  if(valAppID === true) {
    try {
      const config = await supportController.createConfig(req.body);
      return res.status(200).json(config);
    } catch {
      return res.status(400).send({ message: 'Config is duplicated' });
    }
  }
  else{
    return res.status(401).send(CommonErrors.UnauthorizedException());
  }
});
router.delete('/support/configs', async (req, res) => {
  // validate req app-id
  const valAppID = validationService.validateAppID(req.headers, 'support');

  if(valAppID === true) {
    try {
      const config = await supportController.deleteConfigById(req.query.id);
      return res.status(200).json(config);
    } catch {
      return res.status(400).send({ message: `config id: ${req.query.id} is not found` });
    }
  }
  else{
    return res.status(401).send(CommonErrors.UnauthorizedException());
  }
});
router.patch('/support/configs', async (req, res) => {
  // validate req app-id
  const valAppID = validationService.validateAppID(req.headers, 'support');

  if(valAppID === true) {
    try {
      const config = await supportController.updateConfigById(req.query.id, req.body);
      return res.status(200).json(config);
    } catch {
      return res.status(400).send({ message: `config id: ${req.query.id} is not found` });
    }
  }
  else{
    return res.status(401).send(CommonErrors.UnauthorizedException());
  }
});

module.exports = router;
