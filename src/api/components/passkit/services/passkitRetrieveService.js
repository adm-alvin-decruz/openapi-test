require("dotenv").config();
const appConfig = require("../../../../config/appConfig");
const ApiUtils = require("../../../../utils/apiUtils");
const loggerService = require("../../../../logs/logger");
const passkitCommonService = require("./passkitCommonService");

const passkitGeneratorEndpoint = `${
  appConfig[`PASSKIT_URL_${process.env.APP_ENV.toUpperCase()}`]
}${appConfig.PASSKIT_GET_SIGNED_URL_PATH}`;

function createRequestBody(data) {
  return {
    passType: data.membership,
    mandaiId: data.mandaiId,
    visualId: data.visualId,
  };
}

/**
 * handle retrieve passkit
 * @return {Promise<{urls: {apple: (*|string), google: (*|string)}, visualId}|{urls: {apple: string, google: string}, visualId}|undefined>}
 * @param data
 */
async function retrievePasskit(data) {
  const body = createRequestBody(data);
  loggerService.log(
    {
      passkitComponent: {
        data: JSON.stringify(body),
        action: "retrievePasskit",
        layer: "passkitCommonService.retrievePasskit",
      },
    },
    "Start retrievePasskit Service"
  );

  try {
    const headers = await passkitCommonService.setPasskitReqHeader();
    const response = await ApiUtils.makeRequest(
      passkitGeneratorEndpoint,
      "post",
      headers,
        body
    );
    const rsHandler = ApiUtils.handleResponse(response);
    loggerService.log(
      {
        passkitComponent: {
          action: "retrievePasskit",
          layer: "passkitCommonService.retrievePasskit",
          response: `${response}`,
        },
      },
      "End retrievePasskit Service - Success"
    );
    return {
      visualId: data.visualId,
      urls: {
        apple: rsHandler.applePassUrl ? rsHandler.applePassUrl : "",
        google: rsHandler.googlePassUrl ? rsHandler.googlePassUrl : "",
      },
    };
  } catch (error) {
    loggerService.error(
      {
        passkitComponent: {
          data: JSON.stringify(body),
          action: "retrievePasskit",
          layer: "passkitCommonService.retrievePasskit",
          error: new Error("error :", error),
        },
      },
      {
        url: passkitGeneratorEndpoint,
        method: "post",
      },
      "End retrievePasskit Service - Failed"
    );
    //handle 404: case not yet add apple and google passkit
    if (error.message.includes('"status":404')) {
      return {
        visualId: data.visualId,
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
