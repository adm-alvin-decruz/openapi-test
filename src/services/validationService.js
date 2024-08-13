/**
 * Validate App ID
 *
 * @param {*} env
 * @param {*} reqHeader
 * @returns
 */
function validateAppID(reqHeader){
	var mwgAppID = reqHeader['mwg-app-id'];

	if(mwgAppID !== ''){
		if(mwgAppID === process.env.AEM_APP_ID){
			return true;
		}
	}
	return false;
}

// function validateUserSignUp(reqBody){
//   let valParams = validateParams(reqBody);
//   if(valParams !== undefined || valParams.length > 0){
//     // prepare error response
//     Object.keys(valParams).forEach(function(key) {
//       if(reqBody[key] === "undefined"){
//         errorObj.push(key);
//       }
//     })
//   }
// }

/**
 * Validate request parameters
 * Invalid Output similar: {"invalid":["firstName","lastName"],"dob":["dob"]}
 *
 * @param {*} env
 * @param {*} reqBody
 */
function validateParams(reqBody, envVarName){
  const validationVar = JSON.parse(process.env[envVarName]);

  let errorObj = {'status': "success"};
  // check for invalid and dob
  Object.keys(validationVar).forEach(function(key) {
    if(reqBody[key] === undefined){
			(errorObj['invalid']??= []).push(key);
    }
    if(key === 'dob' && reqBody[key] != undefined){
      // validate date of birth
      let dobVal = validateDOB(reqBody[key]);
      if(!validateDOB(reqBody[key])){
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

function validateDOB(dateOfBirth){
  const dob = new Date(dateOfBirth);
  const today = new Date();

  // Calculate age
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  // check if age is between 13 and 99
  return age >= 13 && age <= 99;
}

module.exports = {
  validateAppID,
  validateParams
}