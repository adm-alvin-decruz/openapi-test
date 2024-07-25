require('dotenv').config()
const axios = require('axios');
const FormData = require('form-data');

/**
 * Function Check wildpass by email
 *
 * @param {JSON} reqBody the request JSON
 * @returns
 */
async function aemCheckWildPassByEmail (reqBody){
  // get env dev/uat/prod
  const appEnv = process.env.APP_ENV
  console.log(appEnv);
  // get aem 'check email' url
  const aemURL = buildAemURL (appEnv, "CHECK_WILDPASS");
  console.log(aemURL);

  // send post checkemail to aem
  const formData = new FormData();
  formData.append('email', reqBody.email);

  var res = await axios.post(aemURL, formData)
    .then(response => {
      return response.data
      // console.log(response.data);
    })
    .catch(error => {
      console.log(error);
    });

  return res;
}

function buildAemURL (appEnv, service){
  var aemEnvUrl = switchAppEnvURL (appEnv);
  switch(service) {
    case "RESEND_WILDPASS": {
      aemServicePath = process.env.AEM_RESEND_WILDPASS_PATH;
      break;
    }
    case "CHECK_WILDPASS": {
      aemServicePath = process.env.AEM_WILDPASS_EMAILCHECK_PATH;
      break;
    }
    default: {
      aemServicePath = process.env.AEM_RESEND_WILDPASS_PATH;
      break;
    }
  }

  return aemEnvUrl + aemServicePath;
}

function switchAppEnvURL (appEnv){
  var aemURL = '';
  switch(appEnv) {
    case "uat": {
      aemURL = process.env.AEM_UAT_URL;
      break;
    }
    case "prod": {
      aemURL = process.env.AEM_PROD_URL;
      break;
    }
    default: {
      aemURL = process.env.AEM_UAT_URL;
      break;
    }
  }

  return aemURL;
}

module.exports = {
  aemCheckWildPassByEmail
};