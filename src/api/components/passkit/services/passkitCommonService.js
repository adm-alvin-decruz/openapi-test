require("dotenv").config();
const appConfig = require("../../../../config/appConfig");
const ApiUtils = require("../../../../utils/apiUtils");
const loggerService = require("../../../../logs/logger");

const passkitAPIConfig = `PASSKIT_APP_ID_${process.env.APP_ENV.toUpperCase()}`;
const passkitEndpointGenerator = `https://qkvj4jup4v7hb3rl43lxoe5wjq0hzuyi.lambda-url.ap-southeast-1.on.aws/v1/passkit/all/get`;

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
  try {
    const headers = await setPasskitReqHeader();
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
          },
        },
        "Start getMembershipPasses Service"
    );
    const response = await ApiUtils.makeRequest(
      passkitEndpointGenerator,
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
          error: `${error}`,
        },
      },
      {
        url: passkitEndpointGenerator,
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
  setPasskitReqHeader,
  retrievePasskit,
};
