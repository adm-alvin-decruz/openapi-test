// db
const userModel = require('../../db/models/userModel');
const userMembershipModel = require('../../db/models/userMembershipModel');
const userNewsletterModel = require('../../db/models/userNewletterModel');
const userCredentialModel = require('../../db/models/userCredentialModel');
const userDetailModel = require('../../db/models/userDetailsModel');
const dbConfig = require('../../config/dbConfig');

/**
 * function to create name parameters that ready to use for cognito update
 * If name input not present, name will use existing from Cognito
 *
 * @param {JSON} reqBody
 * @param {JSON} userAttribute
 * @returns
 */
function createNameParameter(reqBody, userAttribute) {
  let name;

  // check if firstName and lastName are provided in reqBody
  if (reqBody.firstName && reqBody.lastName && reqBody.firstName.trim() !== '' && reqBody.lastName.trim() !== '') {
      name = {
          "Name": "name",
          "Value": `${reqBody.firstName.trim()} ${reqBody.lastName.trim()}`
      };
  } else {
      // If firstName or lastName is missing or empty, find the name in userAttribute
      const nameAttribute = userAttribute.find(attr => attr.Name === "name");
      if (nameAttribute) {
          name = {
              "Name": "name",
              "Value": nameAttribute.Value
          };
      } else {
          // If name is not found in userAttribute, use a default or handle the error
          name = {
              "Name": "name",
              "Value": "Unknown"
          };
      }
  }

  return name;
}

/**
 * *************************
 * Update User's Info DB
 * *************************
 */

async function updateDBUserInfo(reqBody, prepareDBUpdateData, userDBData){
  const user_id = userDBData.id;
  const response = [];
  try{
    // prepare data for update
    const keys = Object.keys(prepareDBUpdateData);

    keys.forEach(key => {
      if (typeof dbFunctions[key] === 'function') {
        response[dbFunctions[key]] = dbFunctions[key](user_id, prepareDBUpdateData[key]);
      } else {
        response[key] = `Warning: Function ${key} not found`;
      }
    });
  }
  catch(error){
    response['error'] = error;
  }
}

const dbFunctions = {
  updateUsersModel: async function(user_id, data) {
    await userModel.update(user_id, data);
    // Implement your logic here
  },

  updateUserNewsletterModel: async function(user_id, data) {
    let found = await userNewsletterModel.findNewsletter(user_id, data);
    let result = await userNewsletterModel.update(found.id, data);
    console.log('Updating user newsletter model:', data);
    // Implement your logic here
  }
};

module.exports = {
  createNameParameter,
  updateDBUserInfo
}