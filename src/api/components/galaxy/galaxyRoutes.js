require('dotenv').config()
const express = require('express');
const router = express.Router();
const multer  = require('multer');
const upload = multer();

router.use(express.json());

const galaxyTokenService = require('./services/galaxyTokenService');
const galaxyWPService = require('./services/galaxyWPService');

if(['dev', 'uat'].includes(process.env.APP_ENV) ){
  /**
   * Test generate tokens
   * Response
   */
  router.get('/token', async (req, res) => {
    let token = await galaxyTokenService.getToken('galaxy');
    res.status(200).json(token);
  });

  /**
   * Test save tokens
   * Response
   */
  router.post('/token', async (req, res) => {
    let token = await galaxyTokenService.getTokenOnly('galaxy');
    let newToken = await galaxyTokenService.updateToken(token, req.body);
    res.status(200).json(newToken);
  });

  /**
   * Test save tokens
   * Response
   */
  router.post('/import', async (req, res) => {
    // let token = await galaxyTokenService.getTokenOnly('galaxy');
    let importPass = await galaxyWPService.callMembershipPassApi(req.body);
    res.status(200).json(importPass);
  });
}
module.exports = router;