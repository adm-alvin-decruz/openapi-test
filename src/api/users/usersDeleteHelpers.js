// db
const userModel = require('../../db/models/userModel');
const userMembershipModel = require('../../db/models/userMembershipModel');
const userNewsletterModel = require('../../db/models/userNewletterModel');
const userCredentialModel = require('../../db/models/userCredentialModel');
const userDetailModel = require('../../db/models/userDetailsModel');
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
async function deleteDBUserInfo(userDBData){
  const user_id = userDBData.id;

  try{
    if(['dev', 'uat'].includes(process.env.APP_ENV) ){
      // delete from user's details table
      let userDetail = await userDetailModel.deletebyUserID(user_id);
      // delete from user's memberships table
      let userMembership = await userMembershipModel.deletebyUserID(user_id);
      // delete from user's newsletter table
      let userNewsletter = await userNewsletterModel.deletebyUserID(user_id);
      // delete from user's credential table
      let userCredential = await userCredentialModel.deletebyUserID(user_id);
      // delete from users table
      let user = await userModel.deletebyUserID(user_id);

      return {
        user_detail: userDetail,
        user_membership: userMembership,
        user_newsletter: userNewsletter,
        user_credential: userCredential,
        user: user
      };
    }
  }
  catch(error){
    let err = new Error(`usersDeleteHelpers.deleteDBUserInfo error: ${error}`);
    console.log(err);
    return err;
  }
}

async function disableDBUser(userDBData){
  const user_id = userDBData.id;
  try{
    return await userModel.disableByUserID(user_id);
  }
  catch(error){
    let err = new Error(`usersDeleteHelpers.deleteDBUserInfo error: ${error}`);
    console.log(err);
    return err;
  }
}

module.exports = {
  deleteDBUserInfo,
  disableDBUser
}
