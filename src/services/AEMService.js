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
  const aemURL = buildAemURL (appEnv, "WILDPASS_CHECK_EMAIL");
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
  var aemEnvUrl = process.env.AEM_URL;
  let aemServicePath = 'AEM_PATH_'+service.toUpperCase();

  return aemEnvUrl + process.env[aemServicePath];
}

module.exports = {
  aemCheckWildPassByEmail
};