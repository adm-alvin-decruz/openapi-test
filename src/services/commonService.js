const crypto = require('crypto');
// use dotenv
require('dotenv').config();

const userConfig = require('../config/usersConfig');
const loggerService = require('../logs/logger');

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
    if(key === "email"){
      // case sensitive email handling
      reqData[key] = reqData[key].toLowerCase();
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
  let visualID = reqBody.visualID ? reqBody.visualID : ''; // visual ID will update in queue process
  return {"name":reqBody.group,"visualID": visualID,"expiry":""};
}

function setSource(req){
  let reqBody = req.body;
  let reqHeaders = req.headers;
  let sourceMap = JSON.parse(userConfig.SOURCE_MAPPING);
  if (reqBody && reqBody.source) {
    return reqBody.source;
  }
  return sourceMap[reqHeaders['mwg-app-id']] || 'ORGANIC';
}

/**
 * Detail check JSON array empty or not
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

function valJsonObjOrArray(input, req) {
  try {
    // First check if input exists
    if (!input) {
      loggerService.error(new Error('CommonService.valJsonObjOrArray Input is required'), req.body);
      return false;
    }

    // Check if input is an array
    if (Array.isArray(input)) {
      if (input.length === 0) {
        loggerService.error(new Error('CommonService.valJsonObjOrArray Array input cannot be empty'), req.body);
        return false
      }

      // Validate each object in array
      input.forEach((item, index) => {
        if (!Object.keys(item).length) {
          loggerService.log(`CommonService.valJsonObjOrArray Object at index ${index} is empty`);
        }
      });

      // console.log('Valid array input with', input.length, 'items');
      return true;
    }

    // Check if input is an object
    if (typeof input === 'object' && input !== null) {
      if (Object.keys(input).length === 0) {
        loggerService.log(new Error('CommonService.valJsonObjOrArray Object input cannot be empty'), req.body);
        return false;
      }

      loggerService.log('CommonService.valJsonObjOrArray Valid object input with', Object.keys(input).length, 'properties');
      return true;
    }

    loggerService.error(new Error('CommonService.valJsonObjOrArray Input must be either an array or an object'), req.body);

  } catch (error) {
    loggerService.error('CommonService.valJsonObjOrArray Validation Error:', error);
    return false;
  }
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

// helper function to format date
function formatDate(dateString) {
  const [day, month, year] = dateString.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * {
 *   "Name": "sub",
 *   "Value": "90a4a7b1-1115-484f-8133-89ae1e6448b6"
 * },
 *
 * @param {json} inputJson
 * @returns
 */
function convertUserAttrToNormJson(inputJson) {
  const outputJson = {};

  for (const item of inputJson) {
    let value = item.Value;

    // Parse JSON strings if possible
    try {
      const parsedValue = JSON.parse(value);
      value = parsedValue;
    } catch (error) {
      // If parsing fails, keep the original string value
    }

    // Convert "null" string to actual null value
    if (value === "null") {
      value = null;
    }

    outputJson[item.Name] = value;
  }

  return outputJson;
}

function processUserUpdateErrors(attr, reqBody, mwgCode){
  const validationVar = JSON.parse(userConfig['SIGNUP_VALIDATE_PARAMS']);

  let errors = {};
  if(isJsonNotEmpty(attr) && mwgCode === 'MWG_CIAM_USER_SIGNUP_ERR'){
    if(isJsonNotEmpty(attr.invalid)){
      Object.keys(attr.invalid).forEach(function(key) {
        let msg = validationVar[attr.invalid[key]].invalid;
        msg = msg.replace('%s', attr.invalid[key]);
        errors[attr.invalid[key]]= msg;
      })
    }
    if(isJsonNotEmpty(attr.dob)){
      Object.keys(attr.dob).forEach(function(key) {
        errors['dob']= validationVar['dob'].range_error;
      })
    }
    if(isJsonNotEmpty(attr.newsletter)){
      Object.keys(attr.newsletter).forEach(function(key) {
        errors['newletter']= validationVar['newsletter'].subscribe_error;
      })
    }
  }
  return errors;
}
/**
 * Generate Date in UTC+8, time always 00:00:00
 * @returns 2024-10-22 00:00:00
 */
function getDateTimeUTC8() {
  // Create date object for current time
  const now = new Date();

  // Convert to UTC+8
  const utc8Offset = 8 * 60; // UTC+8 offset in minutes
  const localOffset = now.getTimezoneOffset();
  const totalOffset = utc8Offset + localOffset;

  // Add offset to get UTC+8 time
  const utc8Date = new Date(now.getTime() + totalOffset * 60000);

  // Set time to 00:00:00
  utc8Date.setHours(0, 0, 0, 0);

  // Format the date to remove T and .000Z
  const year = utc8Date.getFullYear();
  const month = String(utc8Date.getMonth() + 1).padStart(2, '0');
  const day = String(utc8Date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day} 00:00:00`;
}

function cleanPhoneNumber(phoneNumber) {
  // Return null for empty, undefined, or explicitly marked empty inputs
  if (!phoneNumber || phoneNumber === '-') {
    return null;
  }

  // Remove all non-digit characters except the plus sign
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // Handle phone numbers with no digits
  if (cleaned.replace('+', '').length === 0) {
    return null;
  }

  // Remove any non-leading plus signs
  if (cleaned.indexOf('+') > 0) {
    cleaned = cleaned.replace(/\+/g, '');
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+')) {
    // Add leading + if it doesn't exist
    cleaned = '+65' + cleaned;
  }

  // Handle common problems

  // Problem 1: Double country codes
  // Example: +65 +81 -9044266787 -> has both +65 and +81
  if (/^\+\d{2,3}\+\d{2,3}/.test(cleaned)) {
    // Take the second country code as the correct one (assumption)
    const match = cleaned.match(/^\+\d{2,3}(\+\d{2,3}.*)/);
    if (match) {
      cleaned = match[1];
    }
  }

  // Problem 2: Missing or incomplete country codes
  if (cleaned.length < 8) {
    // Too short to be valid
    return null;
  }

  // Problem 3: Handle North American numbers with leading 1
  // If number starts with +1 and has 11 digits total, assume it's a valid North American number
  if (cleaned.startsWith('+1') && cleaned.length === 12) {
    return cleaned;
  }

  // Problem 4: Check for unreasonably long numbers
  if (cleaned.length > 16) {
    // E.164 numbers are typically 15 digits or less (including country code)
    // Try to extract a valid number from the beginning
    const possibleNumber = cleaned.substring(0, 15);
    if (/^\+\d{1,3}\d{6,12}$/.test(possibleNumber)) {
      return possibleNumber;
    }
    return null;
  }

  // Check if we have something that looks like a valid E.164 number
  // Country code (1-3 digits) + national number (at least 6 digits)
  if (/^\+\d{1,3}\d{6,12}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
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
  detectAttrPresence,
  formatDate,
  convertUserAttrToNormJson,
  processUserUpdateErrors,
  getDateTimeUTC8,
  valJsonObjOrArray,
  cleanPhoneNumber
}