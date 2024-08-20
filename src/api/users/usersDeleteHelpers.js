// db
const userModel = require('../../db/models/userModel');
const userMembershipModel = require('../../db/models/userMembershipModel');
const userNewsletterModel = require('../../db/models/userNewletterModel');
const userCredentialModel = require('../../db/models/userCredentialModel');
const userDetailModel = require('../../db/models/userDetailsModel');
const dbConfig = require('../../config/dbConfig');
require('dotenv').config();

/**
 * *************************
 * Delete User's Info DB
 * *************************
 */

/**
 * Function delete DB user Info - Only for dev & UAT
 *
 * @param {json} reqBody
 * @param {json} userDBData
 * @returns
 */
async function deleteDBUserInfo(reqBody, userDBData){
  const user_id = userDBData.id;
  const response = [];
  try{
    if(['dev', 'uat'].includes(process.env.APP_ENV) ){
      // delete from user's details table
      response['user_detail'] = await userDetailModel.deletebyUserID(user_id);
      // delete from user's memberships table
      response['user_membership'] = await userMembershipModel.deletebyUserID(user_id);
      // delete from user's newsletter table
      response['user_newsletter'] = await userNewsletterModel.deletebyUserID(user_id);
      // delete from user's credential table
      response['user_credential'] = await userCredentialModel.deletebyUserID(user_id);
      // delete from users table
      response['user'] = await userModel.deletebyUserID(user_id);

      return response;
    }
  }
  catch(error){
    throw error;
    response['error'] = error;
  }
}

module.exports = {
  deleteDBUserInfo
}