const cognitoService = require('../services/cognitoService');
const userModel = require('../db/models/userModel');
const loggerService = require('../logs/logger');

/**
 * Should Ignore Email Disposable validation
 * @async
 * @param {string} email
 * @returns {Promise<boolean>} - identify ignore or not
 */
async function shouldIgnoreEmailDisposable(email) {
  try {
    //1st - Check from cognito if pass no need to inquiry into DB
    const userCognito = await cognitoService.cognitoAdminGetUserByEmail(email);
    if (userCognito && userCognito.$metadata.httpStatusCode === 200) {
      return true;
    }
  } catch (error) {
    //2nd priority - Check from DB if cognito failed
    loggerService.error('Error in shouldIgnoreEmailDisposable:', error);
    const userDB = await userModel.findByEmail(email);
    return Boolean(userDB) && Boolean(userDB.email);
  } 
}

module.exports = {
  shouldIgnoreEmailDisposable,
};
