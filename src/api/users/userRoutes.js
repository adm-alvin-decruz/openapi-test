require('dotenv').config()
const express = require('express');
const router = express.Router();
const multer  = require('multer');
const upload = multer({ limits: {fileSize: 1024 * 1024 * 1} });

const userController = require("./usersContollers" );
const commonService = require('../../services/commonService');
const validationService = require('../../services/validationService');
const {
  isEmptyRequest,
  validateEmail,
  isEmptyAccessToken,
} = require("../../middleware/validationMiddleware");
const userConfig = require('../../config/usersConfig');
const processTimer = require('../../utils/processTimer');
const crypto = require('crypto');
const uuid = crypto.randomUUID();

const pong = {'pong': 'pang'};

router.use(express.json());

router.get('/ping', async (req, res) => {
  return res.json(pong);
});

/**
 * User signup, create new CIAM user
 */
router.post('/users', isEmptyRequest, validateEmail, async (req, res) => {
  req['processTimer'] = processTimer;
  req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();

  // validate req app-id
  const valAppID = validationService.validateAppID(req.headers);

  // validate request params is listed, NOTE: listedParams doesn't have email
  const listedParams = commonService.mapCognitoJsonObj(userConfig.WILDPASS_SOURCE_COGNITO_MAPPING, req.body);

  if(commonService.isJsonNotEmpty(listedParams) === false){
    return res.status(400).json({ error: 'Bad Requests' });
  }

  if(valAppID === true){
    req.body.uuid = uuid;
    let newUser = await userController.adminCreateUser(req);

    req.apiTimer.end('Route CIAM Signup User', startTimer);
    if(newUser.error){
      return res.status(400).json(newUser);
    }

    if('membership' in newUser && 'code' in newUser.membership){
      return res.status(newUser.membership.code).json(newUser);
    }
    return res.status(200).json(newUser);
  }
  else{
    req.apiTimer.end('Route CIAM Signup User Error Unauthorized', startTimer);
    return res.status(401).send({ error: 'Unauthorized' });
  }
})

/**
 * CIAM Update user info
 *
 * Handling most HTTP validation here
 */
router.put('/users', isEmptyRequest, validateEmail, async (req, res) => {
  req['processTimer'] = processTimer;
  req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations
  req.body.uuid = uuid;
  const startTimer = process.hrtime();

  // validate req app-id
  var valAppID = validationService.validateAppID(req.headers);

  // clean the request data for possible white space
  req['body'] = commonService.cleanData(req.body);
  // validate request params is listed, NOTE: listedParams doesn't have email
  var listedParams = commonService.mapCognitoJsonObj(userConfig.WILDPASS_SOURCE_COGNITO_MAPPING, req.body);

  if(commonService.isJsonNotEmpty(listedParams) === false){
    return res.status(400).json({ error: 'Bad Requests' });
  }

  if(valAppID === true){
    let updateUser = await userController.adminUpdateUser(req, listedParams);

    req.apiTimer.end('Route CIAM Update User ', startTimer);
    if('membership' in updateUser && 'code' in updateUser.membership){
      return res.status(updateUser.membership.code).json(updateUser);
    }
    return res.status(200).json(updateUser);
  }
  else{
    req.apiTimer.end('Route CIAM Update User Error Unauthorized', startTimer);
    return res.status(401).send({ error: 'Unauthorized' });
  }
})

/**
 * Resend wildpass
 */
router.post('/users/memberships/resend', isEmptyRequest, validateEmail, async (req, res) => {
  req['processTimer'] = processTimer;
  req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();

  // validate req app-id
  var valAppID = validationService.validateAppID(req.headers);

  if(valAppID === true){
    let resendUser = await userController.membershipResend(req);

    req.apiTimer.end('Route CIAM Resend Membership ', startTimer);
    let code = 200;
    if('membership' in resendUser && 'code' in resendUser.membership){
      code = resendUser.membership.code;
    }
    return res.status(200).json(resendUser);
  }
  else{

    req.apiTimer.end('Route CIAM Resend Membership Error 401 Unauthorized', startTimer);
    return res.status(401).send({ error: 'Unauthorized' });
  }
})

/**
 * Delete user in cognito & DB
 * only in dev/UAT
 */
router.post('/users/delete', isEmptyRequest, validateEmail, async (req, res) => {
  req['processTimer'] = processTimer;
  req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();

  // validate req app-id
  var valAppID = validationService.validateAppID(req.headers);
  if(valAppID === true){
    // allow dev, uat & prod to call. Prod will disable, no deletion
    if(['dev', 'uat', 'prod'].includes(process.env.APP_ENV) ){
      let deleteMember = await userController.membershipDelete(req);

      req.apiTimer.end('Route CIAM Delete User', startTimer);
      return res.status(200).json({deleteMember});
    }
    else{
      req.apiTimer.end('Route CIAM Delete User Error 501 Not Implemented', startTimer);
      return res.status(501).json({error: 'Not Implemented'});
    }
  }
  else{
    req.apiTimer.end('Route CIAM Delete User Error 401 Unauthorized', startTimer);
    return res.status(401).send({ error: 'Unauthorized' });
  }
})

/**
 * Get User API (Method Get)
 */
router.get('/users', upload.none(), isEmptyRequest, validateEmail, async (req, res) => {
  req['processTimer'] = processTimer;
  req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();

  // validate req app-id
  const valAppID = validationService.validateAppID(req.headers);

  if(valAppID === true){
    let getUser = await userController.getUser(req);

    req.apiTimer.end('Route CIAM Get User', startTimer);
    return res.status(200).json(getUser);
  }
  else{
    req.apiTimer.end('Route CIAM Get User Error 401 Unauthorized', startTimer);
    return res.status(401).send({ error: 'Unauthorized' });
  }
});

/**
 * User Login API (Method POST)
 */
router.post(
  "/users/sessions",
  isEmptyRequest,
  validateEmail,
  async (req, res) => {
    req["processTimer"] = processTimer;
    req["apiTimer"] = req.processTimer.apiRequestTimer(true); // log time durations
    const startTimer = process.hrtime();
    // validate req app-id
    const valAppID = validationService.validateAppID(req.headers);
    if (!valAppID) {
      req.apiTimer.end(
        "Route CIAM Login User Error 401 Unauthorized",
        startTimer
      );
      return res.status(401).send({ message: "Unauthorized" });
    }
    try {
      const data = await userController.userLogin(req);
      return res.status(data.statusCode).json(data);
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      return res.status(errorMessage.statusCode).send(errorMessage);
    }
  }
);

/**
 * User Logout API (Method DELETE)
 */
router.delete("/users/sessions", isEmptyAccessToken, async (req, res) => {
  req["processTimer"] = processTimer;
  req["apiTimer"] = req.processTimer.apiRequestTimer(true); // log time durations
  const startTimer = process.hrtime();
  // validate req app-id
  const valAppID = validationService.validateAppID(req.headers);
  if (!valAppID) {
    req.apiTimer.end(
      "Route CIAM Logout User Error 401 Unauthorized",
      startTimer
    );
    return res.status(401).send({ message: "Unauthorized" });
  }
  const token = req.headers.authorization.substring(
    7,
    req.headers.authorization.length
  );
  try {
    const data = await userController.userLogout(token);
    return res.status(data.statusCode).json(data);
  } catch (error) {
    const errorMessage = JSON.parse(error.message);
    return res.status(errorMessage.statusCode).send(errorMessage);
  }
});

// router.post('/users/reset-password', async (req, res) => {
//     // let memberResetPassword = await memberships.userResetPassword();
//     return resjson({memberResetPassword});
// })

// router.post('/users/forgot-password', async (req, res) => {
//     // let memberResetPassword = await memberships.userResetPassword();
//     return resjson({memberResetPassword});
// })

// router.get('/users/:id', (req, res) => {
//     const user = users.find(user => user.id === parseInt(req.params.id));
//     if (!user) res.status(404).json({ message: 'User not found' });
//     return resjson(user);
// });

// router.post('/users', async (req, res) => {
//     console.log(req.body.toJSON());
//     const user = {
//         id: users.length + 1,
//         name: req.body.name,
//         company: req.body.company,
//     };
//     users.push(user);
//     return resjson(user);
// });

// router.delete('/users/:id', async (req, res) => {
//     const userIndex = users.findIndex(user => user.id === parseInt(req.params.id));
//     if (userIndex === -1) res.status(404).json({ message: 'User not found' });
//     users.splice(userIndex, 1);
//     return resjson({ message: 'User deleted' });
// });

// router.put('/users/:id', async (req, res) => {
//     let user = users.find(user => user.id === parseInt(req.params.id));
//     if (!user) res.status(404).json({ message: 'User not found' });
//     user.name = req.body.name;
//     user.company = req.body.company;
//     return resjson(user);
// });

module.exports = router;
