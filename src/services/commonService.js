// use dotenv
require('dotenv').config();

/**
 * Function cleanData
 *
 * @param {json} reqData
 * @returns new cleaned
 */
function cleanData(reqData){
	Object.keys(reqData).forEach(function(key) {
    if(typeof reqData[key] === "string"){
			reqData[key] = trimWhiteSpace (reqData[key]);
    }
	})
	return reqData;
}

/**
 * Function trimWhiteSpace
 *
 * @param {string} str
 * @returns string
 */
function trimWhiteSpace (str){
	return str.trim()
}

function prepareMembershipGroup(reqBody){
  // TODO: update expiry for future FOW, FOW+
  return {"name":reqBody.group,"expiry":""};
}

function generateMandaiId(reqBody){
  return "123456";
}

function setSource(reqHeaders){
  const mwgAppID = reqHeaders['mwg-app-id'];
  let sourceMap = JSON.parse(process.env.SOURCE_MAPPING);
  return sourceMap[mwgAppID];
}

/**
 * Detail check is JSON is not empty
 *
 * @param {JSON} json
 * @returns
 */
function isJsonNotEmpty(json) {
  // check if the input is null or undefined
  if (json == null) {
    return false;
  }

  // check if it's an object
  if (typeof json !== 'object') {
    return false;
  }

  // check if it's an array
  if (Array.isArray(json)) {
    return json.length > 0;
  }

  // Iif it's an object, check if it has any own properties
  return Object.keys(json).length > 0;
}

/**
 * Create a new JSON by mapping 'mappingJSON' & an input JSON from request
 *
 * @param {JSON} mappingJSON
 * @param {JSON} inputJson
 * @returns
 */
function mapJsonObjects(mappingJSON, inputJson) {
  const result = {};
  let mappingJSONObj = JSON.parse(mappingJSON);

  for (const [keyA, valueA] of Object.entries(JSON.parse(mappingJSON))) {
    if (valueA in inputJson) {
      result[keyA] = inputJson[valueA];
    }
  }

  return result;
}

module.exports = {
  cleanData,
  prepareMembershipGroup,
  generateMandaiId,
  setSource,
  isJsonNotEmpty,
  mapJsonObjects
}