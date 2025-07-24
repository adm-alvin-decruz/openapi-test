require("dotenv").config();
const appConfig = require("../../../../config/appConfig");
const { secrets } = require("../../../../services/secretsService");

const passkitAPIConfig = `PASSKIT_APP_ID_${process.env.APP_ENV.toUpperCase()}`;

async function setPasskitReqHeader() {
  return await constructPasskitHeader();
}

async function constructPasskitHeader() {
  try {
    const ciamSecrets = await secrets.getSecrets("ciam-microservice-lambda-config");
    return {
      "mwg-app-id": appConfig[passkitAPIConfig],
      "x-api-key": ciamSecrets.PASSKIT_API_KEY,
      "Content-Type": "application/json",
    };
  } catch (error) {
    throw new Error("constructPasskitHeader error: ", error);
  }
}

module.exports = {
  setPasskitReqHeader,
};
