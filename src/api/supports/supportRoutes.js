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

module.exports = router;