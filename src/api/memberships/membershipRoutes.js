require('dotenv').config()
const express = require('express');
const router = express.Router();
const multer  = require('multer');
const upload = multer({ limits: {fileSize: 1024 * 1024 * 1} });

const membershipsController = require('./membershipsControllers');
const commonService = require('../../services/commonService')
const validationService = require('../../services/validationService')

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
  // if log turned on, log request
  if (process.env.APP_LOG_SWITCH) {
    console.log(req.body);
    console.log(req.headers);
  }
  // clean the request data for possible white space
  const reqBody = commonService.cleanData(req.body);

  // validate req app-id
  const valAppID = validationService.validateAppID(req.headers);
  if (!valAppID) {
    res.status(401).send({ message: "Unauthorized" });
  }
  try {
    const checkMemberResult = await membershipsController.adminGetUser(reqBody);
    res.status(200).send(checkMemberResult);
  } catch (error) {
    res.status(500).send({
      message: "Internal server error",
    });
  }
});

/**
 * Get membership by email
 * Response
 */
router.get('/users/memberships', upload.none(), async (req, res) => {
  // if log turned on, log request
  if(process.env.APP_LOG_SWITCH){
    console.log(req.body);
    console.log(req.headers);
  }

  // clean the request data for possible white space
  let reqBody = commonService.cleanData(req.body);

  // validate req app-id
  let valAppID = validationService.validateAppID(req.headers);
  if(valAppID === false){
    res.status(401).send('Unauthorized');
  }
  else{
    let checkMemberResult = await membershipsController.adminGetUser(reqBody);
    // response
    res.status(200).json(checkMemberResult);
  }
});

// router.post('/users', async (req, res) => {
//   let resUser = await membershipsController.adminCreateUser();
//     res.json({resUser});
// })

module.exports = router;
