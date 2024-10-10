require('dotenv').config()
const express = require('express');
const router = express.Router();
const multer  = require('multer');
const upload = multer({ limits: {fileSize: 1024 * 1024 * 1} });

const supportController = require("./supportControllers" );
const validationService = require('../../services/validationService');
const { isEmptyRequest, validateEmail } = require('../../middleware/validationMiddleware');

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

module.exports = router;