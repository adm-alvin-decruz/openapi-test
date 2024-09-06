// db
const userModel = require('../../db/models/userModel');
const userMembershipModel = require('../../db/models/userMembershipModel');
const userNewsletterModel = require('../../db/models/userNewletterModel');
const userCredentialModel = require('../../db/models/userCredentialModel');
const userDetailModel = require('../../db/models/userDetailsModel');
const userConfig = require('../../config/usersConfig');
const dbConfig = require('../../config/dbConfig');
const galaxyQueryService = require('../components/galaxy/services/galaxyQueryService');
const galaxyHelpers = require('../components/galaxy/galaxyHelpers');
const commonService = require('../../services/commonService');
const galaxyWPService = require('../components/galaxy/services/galaxyWPService');

require('dotenv').config();

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
    if(JSON.stringify(data) != '[]'){
      await userModel.update(user_id, data);
    }
  },

  updateUserNewsletterModel: async function(user_id, data) {
    if(JSON.stringify(data) != '[]'){
      let found = await userNewsletterModel.findNewsletter(user_id, data);
      let result = await userNewsletterModel.update(found.id, data);
    }
  }
};

/******************************
 * Galaxy functions
 *
 *****************************
 */
async function updateGalaxyPass(reqBody, ciamComparedParams, membershipData){
  if(reqBody.group === 'wildpass'){
    return updateGalaxyWildpass(reqBody, ciamComparedParams, membershipData);
  }
}

async function updateGalaxyWildpass(reqBody, ciamComparedParams, membershipData){
  let attrExist = commonService.detectAttrPresence(ciamComparedParams, JSON.parse(userConfig.TRIGGER_GALAXY_UPDATE_PARAMS_WILDPASS));
  if(commonService.isJsonNotEmpty(attrExist)){
    // get user attribute from membershipData
    let membershipCognito = JSON.parse(commonService.findUserAttributeValue(membershipData.cognitoUser.UserAttributes, 'custom:membership'));
    // query galaxy using cognito stored visual ID
    let galaxyUser = await galaxyQueryService.callQueryTicketApi(membershipCognito);
    // get galaxy visual ID
    let visualID = galaxyHelpers.findProductValue(galaxyUser, "visualID", "WILDPASS");
    reqBody['visualId'] = visualID;
    // update galaxy
    let galaxyUpdate = await galaxyWPService.callMembershipUpdatePassApi(reqBody);
    return JSON.stringify(galaxyUpdate);
  }
}


module.exports = {
  createNameParameter,
  updateDBUserInfo,
  updateGalaxyPass
}