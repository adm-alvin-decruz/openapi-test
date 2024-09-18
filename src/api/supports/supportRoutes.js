require('dotenv').config()
const express = require('express');
const router = express.Router();
const multer  = require('multer');
const upload = multer();

const supportController = require("./supportControllers" );
const commonService = require('../../services/commonService');
const validationService = require('../../services/validationService');
const { isEmptyRequest, validateEmail } = require('../../middleware/validationMiddleware');
const userConfig = require('../../config/usersConfig');

const pong = {'pong': 'pang'};

router.use(express.json());

/**
 * User signup, create new CIAM user
 */
// router.post('/users', isEmptyRequest, validateEmail, async (req, res) => {
//   // validate req app-id
//   var valAppID = validationService.validateAppID(req.headers);

//   // validate request params is listed, NOTE: listedParams doesn't have email
//   var listedParams = commonService.mapCognitoJsonObj(userConfig.WILDPASS_SOURCE_COGNITO_MAPPING, req.body);

//   if(commonService.isJsonNotEmpty(listedParams) === false){
//     return res.status(400).json({ error: 'Bad Requests' });
//   }

//   if(valAppID === true){
//     let newUser = await userController.adminCreateUser(req);
//     if(newUser.error){
//       return res.status(400).json(newUser);
//     }

//     if('membership' in newUser && 'code' in newUser.membership){
//       return res.status(newUser.membership.code).json(newUser);
//     }
//     return res.status(200).json(newUser);
//   }
//   else{
//     return res.status(401).send({ error: 'Unauthorized' });
//   }
// })

/**
 * CIAM Update user info
 * Handling most HTTP validation here
 */
// router.put('/users', isEmptyRequest, validateEmail, async (req, res) => {
//   // validate req app-id
//   var valAppID = validationService.validateAppID(req.headers);

//   // clean the request data for possible white space
//   req['body'] = commonService.cleanData(req.body);
//   // validate request params is listed, NOTE: listedParams doesn't have email
//   var listedParams = commonService.mapCognitoJsonObj(userConfig.WILDPASS_SOURCE_COGNITO_MAPPING, req.body);

//   if(commonService.isJsonNotEmpty(listedParams) === false){
//     return res.status(400).json({ error: 'Bad Requests' });
//   }

//   if(valAppID === true){
//     let updateUser = await userController.adminUpdateUser(req, listedParams);

//     if('membership' in updateUser && 'code' in updateUser.membership){
//       return res.status(updateUser.membership.code).json(updateUser);
//     }
//     return res.status(200).json(updateUser);
//   }
//   else{
//     return res.status(401).send({ error: 'Unauthorized' });
//   }
// })



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

// router.post('/users/set-password', async (req, res) => {
//     // let membersetPassword = await userController.adminSetUserPassword();
//     return res.json({membersetPassword});
// })

// router.post('/users/login', async (req, res) => {
//     // let memberLogin = await userController.userLogin();
//     return resjson({memberLogin});
// })

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