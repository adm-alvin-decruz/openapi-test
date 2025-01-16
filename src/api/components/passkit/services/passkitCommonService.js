require('dotenv').config();
const appConfig = require('../../../../config/appConfig');

const passkitAPIConfig = `PASSKIT_APP_ID_${process.env.APP_ENV.toUpperCase()}`;

async function setPasskitReqHeader(){
  return constructPasskitHeader();
}

function constructPasskitHeader(){
  const headers = {
    'mwg-app-id': appConfig[passkitAPIConfig],
    'x-api-key': process.env.PASSKIT_API_KEY,
    'Content-Type': 'application/json'
  };
  return headers;
}



module.exports = {
  setPasskitReqHeader
};
