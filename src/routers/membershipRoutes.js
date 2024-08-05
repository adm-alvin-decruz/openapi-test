require('dotenv').config()
const express = require('express');
const router = express.Router();
const multer  = require('multer');
const upload = multer();

const memberships = require('../controllers/memberships');
const common = require('../services/commonService')

const pong = {'pong': 'pang'};

router.use(express.json());

router.get('/ping', async (req, res) => {
  res.json(pong);
});

/**
 * Get membership by email
 * Response
 */
router.get('/users/memberships', upload.none(), async (req, res) => {
  // sign email to memberships check
  if(process.env.APP_LOG_SWITCH){
    console.log(req.body);
  }

  // clean the request data for possible white space
  var reqBody = common.cleanData(req.body);

  // validate req app-id
  var valAppID = common.validateAppID(process.env, req.headers);
  if(valAppID === false){
    res.status(401).send('Unauthorized');
  }
  else{
    let checkMemberResult = await memberships.adminGetUser(reqBody);
    // response
    res.status(200).json(checkMemberResult);
  }
});

router.post('/users/memberships', async (req, res) => {
  res.status(405).send('Method Not Allowed');
})

module.exports = router;