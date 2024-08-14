require('dotenv').config()
const axios = require('axios');
const FormData = require('form-data');
const loggerService = require('../logs/logger');

/**
 * Function Check wildpass by email
 *
 * @param {JSON} reqBody the request JSON
 * @returns
 */
async function aemCheckWildPassByEmail (reqBody){
  const aemLog = {'aem_check_wildpass_log':[]}
  // get env dev/uat/prod
  const appEnv = process.env.APP_ENV
  // get aem 'check email' url
  const aemURL = buildAemURL (appEnv, "WILDPASS_CHECK_EMAIL");

  // send post checkemail to aem
  const formData = new FormData();
  formData.append('email', reqBody.email);
  aemLog.aem_check_wildpass_log['form_data'] = JSON.stringify(formData);

  try{
    var response = await axios.post(aemURL, formData);
    aemLog.aem_check_wildpass_log['success'] = JSON.stringify(response.data);
    loggerService.log(aemLog);
    return response.data;
  }
  catch(error){
    aemLog.aem_check_wildpass_log['error'] = JSON.stringify(error);
    loggerService.log(aemLog);
    return error;
  }
}

/**
 * Call AEM resend WildPass
 *
 * @param {json} reqBody
 * @returns
 */
async function aemResendWildpass(reqBody){
  const aemLog = {'aem_resend_wildpass_log':[]}
  // get env dev/uat/prod
  const appEnv = process.env.APP_ENV
  // get aem 'check email' url
  const aemURL = buildAemURL (appEnv, "RESEND_WILDPASS");

  // send post checkemail to aem
  const formData = new FormData();
  formData.append('email', reqBody.email);
  formData.append('recaptchaResponse', reqBody.recaptchaResponse);
  aemLog.aem_resend_wildpass_log['form_data'] = JSON.stringify(formData);

  try{
    var response = await axios.post(aemURL, formData);
    aemLog.aem_resend_wildpass_log['success'] = JSON.stringify(response.data);
    loggerService.log(aemLog);
    return response.data;
  }
  catch(error){
    aemLog.aem_resend_wildpass_log['error'] = JSON.stringify(error);
    loggerService.log(aemLog);
    return error;
  }
}

/**
 * Build AEM URL
 *
 * @param {str} appEnv
 * @param {str} service
 * @returns
 */
function buildAemURL (appEnv, service){
  var aemEnvUrl = process.env.AEM_URL;
  let aemServicePath = 'AEM_PATH_'+service.toUpperCase();

  return aemEnvUrl + process.env[aemServicePath];
}

module.exports = {
  aemCheckWildPassByEmail,
  aemResendWildpass
};