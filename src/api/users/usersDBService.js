// db
const userModel = require('../../db/models/userModel');
const userNewsletterModel = require('../../db/models/userNewletterModel');
const userDetailModel = require('../../db/models/userDetailsModel');
const userMigrationsModel = require('../../db/models/userMigrationsModel');
const userConfig = require('../../config/usersConfig');
const { convertDateToMySQLFormat, formatDateToMySQLDateTime } = require('../../utils/dateUtils');
const loggerService = require('../../logs/logger');

/**
 * Get User By Email
 *
 * @param {json} reqBody
 * @returns
 */
async function getDBUserByEmail(reqBody) {
  return userModel.findByEmail(reqBody.email);
}

async function queryWPUserByEmail(reqBody) {
  let result = await userModel.findWPFullData(reqBody.email);
  if (JSON.stringify(result.data) == '[]' || !result.data) {
    throw new Error(`DB result is empty: ${result.sql_statement}`);
  }
  return result.data;
}

function prepareDBUpdateData(ciamAttrInput) {
  const USER_CFG_MAP = JSON.parse(userConfig.DB_USERS_MODEL_MAPPING);
  const USER_NEWS_CFG_MAP = JSON.parse(userConfig.DB_USER_NEWSLETTER_MAPPING);
  let result = {
    updateUsersModel: {},
    updateUserNewsletterModel: {},
  };

  // process updateAttrInput and USER_CFG_MAP
  ciamAttrInput.forEach(function (item) {
    if (USER_CFG_MAP[item.Name] !== undefined) {
      result.updateUsersModel[item.Name] = item.Value;
    }
    if (item.Name === 'birthdate') {
      result.updateUsersModel[item.Name] = convertDateToMySQLFormat(item.Value);
    }

    // handle custom:newsletter separately
    if (item.Name === 'custom:newsletter') {
      try {
        let newsletterData = JSON.parse(item.Value);
        Object.keys(USER_NEWS_CFG_MAP).forEach(function (key) {
          if (newsletterData[key] !== undefined) {
            result.updateUserNewsletterModel[key] = newsletterData[key];
          }
        });
      } catch (e) {
        console.error('Error parsing custom:newsletter:', e);
      }
    }

    if (item.Name === 'otp_email_disabled_until') {
      let disabledUntilDate = null;
      try {
        disabledUntilDate = new Date(item.Value);
        disabledUntilDate = formatDateToMySQLDateTime(disabledUntilDate);
      } catch (e) {
        loggerService.error(e, {}, '[CIAM-MAIN] Prepare DB Update Data - Failed to parse custom:otp_email_disabled_until');
      }

      result.updateUsersModel['otp_email_disabled_until'] = disabledUntilDate;
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
  if (param1 === 'signup') {
    reqBody.signup = true;
  }
  if (param2 === 'signupSQS') {
    reqBody.signup_sqs = true;
  }

  return userMigrationsModel.update(reqBody.email, reqBody.batchNo, reqBody);
}

async function userModelExecuteUpdate(userId, firstName, lastName, dob, email) {
  const updateFields = {
    given_name: firstName,
    family_name: lastName,
    birthdate: dob ? convertDateToMySQLFormat(dob) : undefined,
    email: email,
  };

  return await userModel.update(userId, updateFields);
}

async function userNewsletterModelExecuteUpdate(userId, newsletter) {
  const updateFields = {
    name: newsletter.name ? newsletter.name : undefined,
    type: newsletter.type ? newsletter.type : undefined,
    subscribe: newsletter.subscribe ? newsletter.subscribe : undefined,
  };

  return await userNewsletterModel.updateByUserId(userId, updateFields);
}

async function userDetailsModelExecuteUpdate(userId, phoneNumber, address, country) {
  //enhance other params
  const updateFields = {
    phone_number: phoneNumber ? phoneNumber : undefined,
    address: address,
    zoneinfo: country,
  };

  return await userDetailModel.updateByUserId(userId, updateFields);
}

module.exports = {
  getDBUserByEmail,
  queryWPUserByEmail,
  prepareDBUpdateData,
  updateUserMigration,
  userModelExecuteUpdate,
  userNewsletterModelExecuteUpdate,
  userDetailsModelExecuteUpdate,
};
