const userConfig = require('../config/usersConfig');
const appConfig = require('../config/appConfig');
const commonService = require('./commonService');

/**
 * Validate App ID
 *
 * @param {*} reqHeader
 * @param module
 * @returns
 */
function validateAppID(reqHeader, module=''){
  var mwgAppID = reqHeader['mwg-app-id'];
  const appEnv = process.env.APP_ENV;
  let appconfigKey = "APP_ID_"+appEnv.toUpperCase();
  if(module === 'support'){
    appconfigKey = "APP_ID_SUPPORT_"+appEnv.toUpperCase();
  }
  const envAppIDArr = JSON.parse(appConfig[appconfigKey]);

  // method to check if the input exists in the JSON array
  const valueExists = envAppIDArr.includes(mwgAppID);

  return !!valueExists;
}

/**
 * Validate request parameters
 * Invalid Output similar: {"invalid":["firstName","lastName"],"dob":["dob"]}
 *
 * @param {*} env
 * @param {*} reqBody
 */
function validateParams(reqBody, configName){
  const validationVar = JSON.parse(userConfig[configName]);

  let errorObj = {'status': "success"};
  // check for invalid and dob
  Object.keys(validationVar).forEach(function(key) {
    if(reqBody[key] === undefined){
			(errorObj['invalid']??= []).push(key);
    }
    if(key === 'dob' && reqBody[key] != undefined){
      // validate date of birth
      let dobVal = validateDOB(reqBody[key]);
      if(!dobVal){
        errorObj['dob']= ['range_error'];
      }
    }
    if(key === 'newsletter' && reqBody[key] != undefined){
      // check if subscribe
      let newsletter = reqBody[key];
      if(newsletter.subscribe !== true){
        errorObj['newsletter']= ['subscribe_error'];
      }
    }
	})

  if(errorObj.invalid || errorObj.dob || errorObj.newsletter){
    errorObj['status'] = 'failed';
  }

  return errorObj;
}

function validateDOB(birthdate){
  // Parse the birthdate string
  const [day, month, year] = birthdate.split('/').map(Number);

  // Create a Date object for the birthdate
  // Note: months in JavaScript Date are 0-indexed, so we subtract 1 from the month
  const birthdateObj = new Date(year, month - 1, day);

  // Get the current date
  const currentDate = new Date();

  // Calculate age
  let age = currentDate.getFullYear() - birthdateObj.getFullYear();

  // Adjust age if birthday hasn't occurred this year
  const monthDiff = currentDate.getMonth() - birthdateObj.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthdateObj.getDate())) {
    age--;
  }

  // Check if age is within the range [13, 99]
  return age >= 13 && age <= 99;
}

module.exports = {
  validateAppID,
  validateParams
}
