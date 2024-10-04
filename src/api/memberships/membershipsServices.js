/**
 * This service should use to process membership related only
 * Process response after getting the result from cognito
 */

// use dotenv
require('dotenv').config();
const responseConfig = require('../../config/membershipConfig');

/**
 * Function process response
 *
 * @param {JSON} attr attribute section of the cognito response
 * @param {JSON} reqBody request body
 * @param {string} status status text success | failed
 * @param {int} statusCode status code 200 | 400 | 501
 * @returns
 */
async function processResponse(attr='', reqBody, mwgCode){
  // step1: read env var for MEMBERSHIPS_API_RESPONSE_CONFIG
  let resConfigVar = JSON.parse(responseConfig.MEMBERSHIPS_API_RESPONSE_CONFIG);
  let resConfig = resConfigVar[mwgCode];

  // step2: process membership group
  // check if attr is JSON with consideration of aem checkemail response
  const isJsonAttr = isJSONObject(attr.UserAttributes);

  var group = '';
  if(resConfig.status === 'success' && isJsonAttr){
    group = processMembership(attr, reqBody);
  }
  // handle aem checkemail api response
  else if (!isJsonAttr && attr === 'aem'){
    var exist = true;
    if(mwgCode === 'MWG_CIAM_USERS_MEMBERSHIPS_NULL'){
        exist = false;
    }
    group = processAemGroup(reqBody, exist);
  }

  // step3: craft response JSON
  let resJson = {
    "membership": {
      "group": group,
      "code": resConfig.code,
      "mwgCode": resConfig.mwgCode,
      "message": resConfig.message,
      "email": reqBody.email,
    },
    "status": resConfig.status,
    "statusCode": resConfig.code
    }

  return resJson;
}

/**
 * Function process group
 *
 * @param {json} attr array of user's attribute from cognito
 * @param {json} reqBody request body
 * @returns json group object
 */
function processMembership(attr, reqBody){
  var reqGroupName = reqBody.group;
  let grpAttr = loopAttr(attr, 'custom:membership', '');

  // parse JSON
  if(grpAttr != false){
    let grpJson = JSON.parse(grpAttr.Value);
    // check if not null
    if(grpJson != null){
      return {[grpJson.name]: true};
    }
  }

  return {[reqGroupName]: false}
}

/**
 * Function loop attribute to find the desire name or value
 *
 * @param {json} attr array of user's attribute from cognito or
 * @param {string} name name of attribute to be found
 * @param {*} value value of attribute to be found
 * @returns json object
 */
function loopAttr(attr, name, value=''){
  let foundAttr = false;
  let userAttr = attr.UserAttributes;

  Object.keys(userAttr).forEach(key => {
    if(userAttr[key].Name === name || key === name){
      if(value != '' || userAttr[key].Value === value){
      // attr found, return
      foundAttr = key;
      } else {
        foundAttr = userAttr[key];
      }
    }
  });
  return foundAttr;
}

function processAemGroup(reqBody, exist){
  // AEM only has wildpass
  return {["wildpass"]: exist}
}

function isJSONObject(obj) {
  return Array.isArray(obj);
}

/** export the module */
module.exports = {
  processMembership,processResponse
};