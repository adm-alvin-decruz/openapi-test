require("dotenv").config();
const appConfig = require("../../../../config/appConfig");
const ApiUtils = require("../../../../utils/apiUtils");
const loggerService = require("../../../../logs/logger");

const passkitAPIConfig = `PASSKIT_APP_ID_${process.env.APP_ENV.toUpperCase()}`;
const passkitGeneratorEndpoint = `${appConfig[`PASSKIT_URL_${process.env.APP_ENV.toUpperCase()}`]}${appConfig.PASSKIT_GET_SIGNED_URL_PATH}`;

async function setPasskitReqHeader() {
  return constructPasskitHeader();
}

function constructPasskitHeader() {
  return {
    "mwg-app-id": appConfig[passkitAPIConfig],
    "x-api-key": process.env.PASSKIT_API_KEY,
    "Content-Type": "application/json",
  };
}

/**
 * handle retrieve passkit
 * @param mandaiId
 * @param membership
 * @param visualId
 * @return {Promise<{urls: {apple: (*|string), google: (*|string)}, visualId}|{urls: {apple: string, google: string}, visualId}|undefined>}
 */
async function retrievePasskit(mandaiId, membership, visualId) {

  loggerService.log(
    {
      passkitComponent: {
        data: {
          passType: membership,
          mandaiId: mandaiId,
          visualId: visualId,
          url: this.passkitGeneratorEndpoint
        },
        action: "retrievePasskit",
        layer: "passkitCommonService.retrievePasskit",
      },
    },
    "Start getMembershipPasses Service"
  );

  try {
    const headers = await setPasskitReqHeader();
    const response = await ApiUtils.makeRequest(
      passkitGeneratorEndpoint,
      "post",
      headers,
      {
        passType: membership,
        mandaiId: mandaiId,
        visualId: visualId,
      }
    );
    const rsHandler = ApiUtils.handleResponse(response);
    loggerService.log(
      {
        passkitComponent: {
          data: {
            passType: membership,
            mandaiId: mandaiId,
            visualId: visualId,
          },
          action: "retrievePasskit",
          layer: "passkitCommonService.retrievePasskit",
          response: `${response}`,
        },
      },
      "End getMembershipPasses Service - Success"
    );
    return {
      visualId,
      urls: {
        apple: rsHandler.applePassUrl ? rsHandler.applePassUrl : "",
        google: rsHandler.googlePassUrl ? rsHandler.googlePassUrl : "",
      },
    };
  } catch (error) {
    loggerService.error(
      {
        passkitComponent: {
          data: {
            passType: membership,
            mandaiId: mandaiId,
            visualId: visualId,
          },
          action: "retrievePasskit",
          layer: "passkitCommonService.retrievePasskit",
          error: new Error ("error :", error),
        },
      },
      {
        url: passkitGeneratorEndpoint,
        method: "post",
      },
      "End getMembershipPasses Service - Failed"
    );
    //handle 404: case not yet add apple and google passkit
    if (error.message.includes('"status":404')) {
      return {
        visualId,
        urls: {
          apple: "",
          google: "",
        },
      };
    }
    //handle other status: 403 Forbidden, 400 Bad Request, 500 Internal Server Error will not attach passes by visualId
    return undefined;
  }
}

module.exports = {
  retrievePasskit,
};
