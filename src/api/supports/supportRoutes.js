require('dotenv').config()
const express = require('express');
const router = express.Router();
const multer  = require('multer');
const upload = multer({ limits: {fileSize: 1024 * 1024 * 1} });

const supportController = require("./supportControllers" );
const validationService = require('../../services/validationService');
const { isEmptyRequest, validateEmail } = require('../../middleware/validationMiddleware');
const processTimer = require('../../utils/processTimer');

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
    // let membersetPassword = await userController.adminSetUserPassword();
    return res.json({membersetPassword});
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

module.exports = router;