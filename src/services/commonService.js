const crypto = require('crypto');
// use dotenv
require('dotenv').config();

const userConfig = require('../config/usersConfig');

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
  return {"name":reqBody.group,"visualID": reqBody.visualID,"expiry":""};
}

function setSource(reqHeaders){
  const mwgAppID = reqHeaders['mwg-app-id'];
  let sourceMap = JSON.parse(userConfig.SOURCE_MAPPING);
  return sourceMap[mwgAppID];
}

/**
 * Detail check JSON empty or not
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

  // if it's an object, check if it has any own properties
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

/**
 * Create a new cognito format JSON by mapping 'mappingJSON' & an input JSON from request
 * {
        "Name": "given_name",
        "Value": "Kay"
    }
 *
 * @param {JSON} mappingJSON
 * @param {JSON} inputJson
 * @returns
 */
function mapCognitoJsonObj(mappingJSON, inputJSON){
  const jsonC = [];

  for (const [keyA, valueA] of Object.entries(JSON.parse(mappingJSON))) {
    if (valueA in inputJSON) {
      let value = inputJSON[valueA];
      if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        value = JSON.stringify(value);
      }
      jsonC.push({
        Name: keyA,
        Value: value
      });
    }
  }

  return jsonC;
}

/**
 * Map input JSON to source format. If no change, return empty
 * If any params change, will return the changed name and value
 *
 * @param {json} inputJson
 * @param {json} sourceCompare
 * @returns
 */
function compareAndFilterJSON(inputJson, sourceCompare) {
  // Convert jsonB to a map for easier lookup
  const jsonBMap = new Map(sourceCompare.map(item => [item.Name, item.Value]));

  // Filter inputJson
  const result = inputJson.filter(itemA => {
      const valueB = jsonBMap.get(itemA.Name);
      // Keep the item if it's not in sourceCompare or if the values are different
      return valueB === undefined || itemA.Value !== valueB;
  });

  return result;
}

/**
 * Find user attributes from cognito
 *
 * @param {json} userAttributes
 * @param {string} attribute
 * @returns
 */
function findUserAttributeValue(userAttributes, attribute) {
  // Find the attribute object where the Name matches the attribute input
  const attributeObject = userAttributes.find(attr => attr.Name === attribute);

  // Return the Value if the attribute object is found, otherwise return null
  return attributeObject ? attributeObject.Value : null;
}

function decodeBase64(base64String) {
  let buff = Buffer.from(base64String, 'base64');
  let decodedString = buff.toString('utf8');
  return decodedString;
}

/**
 * Convert date with slashes / to hyphen -
 * @param {string} inputDate
 * @returns
 */
function convertDateHyphenFormat(inputDate) {
  const [day, month, year] = inputDate.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * {"name":"wildpass","visualID":"24110876643220562330","expiry":""}
 *
 * @param {json} jsonObj
 * @param {string} objKey
 */
function findJsonObjValue(jsonObj, objKey){
  for (const key in jsonObj) {
    if(jsonObj[key] === objKey){
      return jsonObj[key];
    }
  }
}

function replaceSqlPlaceholders(sql, params) {
  let index = 0;
  return sql.replace(/\?/g, () => {
    const value = params[index++];
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    } else if (value === null) {
      return 'NULL';
    } else {
      return value;
    }
  });
}

function extractStringPart(input, index) {
  if (typeof input !== 'string' || input.trim() === '') {
    throw new Error('Input must be a non-empty string');
  }

  if (typeof index !== 'number' || index < 0 || !Number.isInteger(index)) {
    throw new Error('Index must be a non-negative integer');
  }

  const parts = input.split('.');

  if (index >= parts.length) {
    throw new Error('Index out of bounds');
  }

  return parts[index];
}

/**
 *
 * // Example usage
  * const a = [
  *   {"Name":"birthdate","Value":"01/02/1992"},
  *   {"Name":"name","Value":"Kay Liong"}
  * ];
  * const b = ["birthdate", "newsletter"];
 * return ["birthdate"]
 * @returns array
 */
/**
 *
 * @param {json} a input to check
 * @param {json} b config arr
 * @returns
 */
function detectAttrPresence(a, b){
    // Create a Set of Names from 'a' for efficient lookup
    const aNames = new Set(a.map(item => item.Name));

    // Filter 'b' to only include items that are present in 'a'
    return b.filter(item => aNames.has(item));
}

module.exports = {
  cleanData,
  prepareMembershipGroup,
  setSource,
  isJsonNotEmpty,
  mapJsonObjects,
  mapCognitoJsonObj,
  compareAndFilterJSON,
  findUserAttributeValue,
  findJsonObjValue,
  decodeBase64,
  convertDateHyphenFormat,
  replaceSqlPlaceholders,
  extractStringPart,
  detectAttrPresence
}