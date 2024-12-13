/**
 * This service should use to process membership related only
 * Process response after getting the result from cognito
 */

// use dotenv
require('dotenv').config();
const responseConfig = require('../../config/membershipConfig');
const cognitoService = require('../../services/cognitoService');
const AEMService = require("../../services/AEMService");
const { LANGUAGE_CODE } = require("../../utils/constants");

function messageMultipleLanguage(code) {
  switch (code) {
    case LANGUAGE_CODE.JAPAN: {
      return responseConfig.MEMBERSHIPS_API_RESPONSE_CONFIG_JP;
    }
    case LANGUAGE_CODE.KOREAN: {
      return responseConfig.MEMBERSHIPS_API_RESPONSE_CONFIG_KR;
    }
    case LANGUAGE_CODE.CHINA: {
      return responseConfig.MEMBERSHIPS_API_RESPONSE_CONFIG_ZH;
    }
    default:
      return responseConfig.MEMBERSHIPS_API_RESPONSE_CONFIG_EN;
  }
}
/**
 * Function process response
 *
 * @param {JSON} attr attribute section of the cognito response
 * @param {JSON} reqBody request body
 * @param {string} status status text success | failed
 * @param {int} statusCode status code 200 | 400 | 501
 * @returns
 */
async function processResponse(attr = "", reqBody, mwgCode) {
  // step1: read env var for MEMBERSHIPS_API_RESPONSE_CONFIG
  const message = messageMultipleLanguage(
    !!reqBody.language ? reqBody.language : ""
  );
  let resConfigVar = JSON.parse(message);
  let resConfig = resConfigVar[mwgCode];

  // step2: process membership group
  // check if attr is JSON with consideration of aem checkemail response
  const isJsonAttr = isJSONObject(attr.UserAttributes);

  var group = '';
  if(resConfig.status === 'success' && isJsonAttr){
    group = processMembership(attr, reqBody);
  }
  // handle aem checkemail api response
  else if (!isJsonAttr && attr == 'aem'){
    var exist = true;
    if(mwgCode === 'MWG_CIAM_USERS_MEMBERSHIPS_NULL'){
        exist = false;
    }
    group = processAemGroup(reqBody, exist);
  }

  // step3: craft response JSON
  let resJson = {
    membership: {
      group: group,
      code: resConfig.code,
      mwgCode: resConfig.mwgCode,
      message: resConfig.message,
      email: reqBody.email,
    },
    status: resConfig.status,
    statusCode: resConfig.code,
  };

  return resJson;
}

async function prepareResponse(reqBody, group, mwgCode) {
  const message = messageMultipleLanguage(
    !!reqBody.language ? reqBody.language : ""
  );
  const resConfigVar = JSON.parse(message);
  const resConfig = resConfigVar[mwgCode];

  return group
    ? {
        membership: {
          group: JSON.parse(group),
          code: resConfig.code,
          mwgCode: resConfig.mwgCode,
          message: resConfig.message,
          email: reqBody.email,
        },
        status: resConfig.status,
        statusCode: resConfig.code,
      }
    : {
        membership: {
          code: resConfig.code,
          mwgCode: resConfig.mwgCode,
          message: resConfig.message,
          email: reqBody.email,
        },
        status: resConfig.status,
        statusCode: resConfig.code,
      };
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

//Check user membership group in Cognito [fow, fow+, wildpass]
async function checkUserMembershipCognito(reqBody) {
  //get user from Cognito
  const userCognito = await cognitoService.cognitoAdminGetUser({
    body: {
      email: reqBody.email,
    },
  });

  //if user not found -> return record not found
  if (["failed", "not found"].includes(userCognito.status)) {
    return prepareResponse(reqBody, "", "MWG_CIAM_USERS_MEMBERSHIPS_NULL");
  }

  //get user membership cognito group
  const cognitoUserGroup = loopAttr(userCognito, "custom:membership", "");
  if (!cognitoUserGroup.Value) {
    return prepareResponse(
      reqBody,
      `{"${reqBody.group}": false}`,
      "MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS"
    );
  }

  //if group exists at user cognito -> true | false
  const isMatchedMemberGroup = JSON.stringify(cognitoUserGroup.Value).includes(
    reqBody.group
  );

  return prepareResponse(
    reqBody,
    `{"${reqBody.group}": ${isMatchedMemberGroup}}`,
    "MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS"
  );
}

//Check user membership group in AEM [wildpass]
async function checkUserMembershipAEM(reqBody) {
  // check route if true
  let response = "";
  if (
    process.env.AEM_WILDPASS_EMAILCHECK_ROUTE === "true" &&
    reqBody.group === "wildpass"
  ) {
    var aemResponse = await AEMService.aemCheckWildPassByEmail(reqBody);
    var noMembership = aemResponse.data.valid;

    if (noMembership === "true") {
      // means email has no membership in aem
      response = await processResponse(
        "aem",
        reqBody,
        "MWG_CIAM_USERS_MEMBERSHIPS_NULL"
      );
    } else {
      // has membership in aem and success
      response = await processResponse(
        "aem",
        reqBody,
        "MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS"
      );
    }
    if (process.env.APP_LOG_SWITCH === "true") {
      response["source"] = "aem";
      console.log(aemResponse);
      // NOTE: don't log response here because caller function (adminGetUser) is logged
    }
  }
  return response;
}

/** export the module */
module.exports = {
  processMembership,
  processResponse,
  checkUserMembershipCognito,
  prepareResponse,
  checkUserMembershipAEM,
};
