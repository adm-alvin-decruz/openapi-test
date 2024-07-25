/**
 * This service should use to process membership related only
 * Process response after getting the result from cognito
 */

// use dotenv
require('dotenv').config();

/**
 * Function to process membership data
 *
 * @param {JSON} data
 * @param {JSON} reqBody
 * @returns
 */
function processMembership(data, reqBody){
    var attr = data.UserAttributes;
    member = loopAttr(attr, 'email', reqBody.email);
    if(member !== false){
        return processResponse(attr, reqBody, 'MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS');
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
function processResponse(attr='', reqBody, mwgCode){
    // step1: read env var for MEMBERSHIPS_API_RESPONSE_CONFIG
    var resConfigVar = JSON.parse(process.env.MEMBERSHIPS_API_RESPONSE_CONFIG);
    var resConfig = resConfigVar[mwgCode];

    // step2: process membership group
    // check if attr is JSON with consideration of aem checkemail response
    const isJsonAttr = isJSONObject(attr);

    if(resConfig.status === 'success' && isJsonAttr){
        var group = processGroup(attr, reqBody);
    }
    // handle aem checkemail api response
    else if (!isJsonAttr && attr === 'aem'){
        var exist = true;
        if(mwgCode === 'MWG_CIAM_USERS_MEMBERSHIPS_NULL'){
            exist = false;
        }
        var group = processAemGroup(reqBody, exist);
    }

    // step3: craft response JSON
    return {
        "membership": {
          "group": group,
          "code": resConfig.code,
          "mwgCode": resConfig.mwgCode,
          "message": resConfig.message,
          "email": reqBody.email
        },
        "status": resConfig.status,
        "statusCode": resConfig.code
      }

}

/**
 * Function process group
 *
 * @param {json} attr array of user's attribute from cognito
 * @param {json} reqBody request body
 * @returns json group object
 */
function processGroup(attr, reqBody){
    var reqGroupName = reqBody.group;
    grpAttr = loopAttr(attr, 'custom:group', '');

    // parse JSON
    if(grpAttr != false){
        grpJson = JSON.parse(grpAttr.Value);
        var grpObj = loopAttr(grpJson, reqGroupName, 'expiry');
        if(grpObj != false){
            return {[grpObj.name]: true};
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
    var attrObj = false;
    attr.forEach(function(attribute) {
        if(attribute.Name === name || attribute.name === name){
            if(value != '' || attribute.Value === value){
            // attr found, return
            attrObj = attribute;
            } else {
                attrObj = attribute;
            }
        }
    });
    return attrObj;
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