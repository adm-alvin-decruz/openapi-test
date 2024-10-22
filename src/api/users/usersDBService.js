// db
const pool = require('../../db/connections/mysqlConn');
const userModel = require('../../db/models/userModel');
const userMembershipModel = require('../../db/models/userMembershipModel');
const userNewsletterModel = require('../../db/models/userNewletterModel');
const userCredentialModel = require('../../db/models/userCredentialModel');
const userDetailModel = require('../../db/models/userDetailsModel');
const userMigrationsModel = require('../../db/models/userMigrationsModel');
const userConfig = require('../../config/usersConfig');
const { getCurrentUTCTimestamp, convertDateToMySQLFormat } = require('../../utils/dateUtils');

/**
 * Get User By Email
 *
 * @param {json} reqBody
 * @returns
 */
async function getDBUserByEmail(reqBody){
  return userModel.findByEmail(reqBody.email);
}

async function queryWPUserByEmail(reqBody) {
  let result = await userModel.findWPFullData(reqBody.email);

  if(JSON.stringify(result.data) == '[]'){
    throw new Error(`DB result is empty: ${result.sql_statement}`);
  }
  return result.data;
}

function prepareDBUpdateData(ciamAttrInput) {
  const USER_CFG_MAP = JSON.parse(userConfig.DB_USERS_MODEL_MAPPING);
  const USER_NEWS_CFG_MAP = JSON.parse(userConfig.DB_USER_NEWSLETTER_MAPPING);
  let result = {
    updateUsersModel: {},
    updateUserNewsletterModel: {}
  };

  // process updateAttrInput and USER_CFG_MAP
  ciamAttrInput.forEach(function(item) {
    if (USER_CFG_MAP.hasOwnProperty(item.Name)) {
      result.updateUsersModel[item.Name] = item.Value;
    }
    if (item.Name === 'birthdate'){
      result.updateUsersModel[item.Name] = convertDateToMySQLFormat(item.Value);
    }

    // handle custom:newsletter separately
    if (item.Name === 'custom:newsletter') {
      try {
        let newsletterData = JSON.parse(item.Value);
        Object.keys(USER_NEWS_CFG_MAP).forEach(function(key) {
          if (newsletterData.hasOwnProperty(key)) {
            result.updateUserNewsletterModel[key] = newsletterData[key];
          }
        });
      } catch (e) {
        console.error('Error parsing custom:newsletter:', e);
      }
    }
  });

  // return empty arrays if no matches found
  if (Object.keys(result.updateUsersModel).length === 0) {
    result.updateUsersModel = [];
  }
  if (Object.keys(result.updateUserNewsletterModel).length === 0) {
    result.updateUserNewsletterModel = [];
  }

  return result;
}

async function updateUserMigration(req, param1, param2) {
  let reqBody = req.body;
  reqBody.signup = false;
  reqBody.signup_sqs = false;
  if(param1 === 'signup'){
    reqBody.signup = true;
  }
  if(param2 === 'signupSQS'){
    reqBody.signup_sqs = true;
  }

  userMigrationsModel.update(reqBody.email, reqBody.batchNo, reqBody);

}

module.exports = {
  getDBUserByEmail,
  queryWPUserByEmail,
  prepareDBUpdateData,
  updateUserMigration
}