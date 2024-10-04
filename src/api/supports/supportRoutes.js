require('dotenv').config()
const express = require('express');
const router = express.Router();
const multer  = require('multer');
const upload = multer({ limits: {fileSize: 1024 * 1024 * 1} });

const supportController = require("./supportControllers" );
const validationService = require('../../services/validationService');
const { isEmptyRequest, validateEmail } = require('../../middleware/validationMiddleware');

router.use(express.json());

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

module.exports = router;