require("dotenv").config();
const appConfig = require("../../../../config/appConfig");
const ApiUtils = require("../../../../utils/apiUtils");
const loggerService = require("../../../../logs/logger");
const appTokenModel = require("../../../../db/models/appTokenModel");
const { maskKeyRandomly } = require("../../../../utils/common");

const nopCommerceAccessTokenUrl = `${
  appConfig[`NOP_COMMERCE_URL_${process.env.APP_ENV.toUpperCase()}`]
}${appConfig.NOP_COMMERCE_ACCESS_TOKEN_PATH}`;

async function getAccessToken(isRefreshToken = false) {
  //get token from DB
  const appToken = await appTokenModel.getLatestToken("nopCommerce");
  if (
    appToken &&
    appToken.credentials &&
    appToken.credentials.client_secret &&
    appToken.token &&
    appToken.token.accessToken &&
    !isRefreshToken
  ) {
    return {
      accessToken: appToken.token.accessToken,
      storeId: appToken.configuration.storeId,
    };
  }

  const dataLogger = {
    membershipSecretKey: appToken.credentials.client_secret,
    storeId: appToken.configuration.storeId,
  };

  try {
    loggerHandler(
      "Proceed getAccessToken from NopCommerce - Start",
      dataLogger
    );
    const response = await ApiUtils.makeRequest(
      nopCommerceAccessTokenUrl,
      "post",
      {
        "Content-Type": "application/json",
      },
      {
        membershipSecretKey: appToken.credentials.client_secret,
        storeId: appToken.configuration.storeId,
      }
    );

    if (
      !response ||
      !response.GenerateMembershipTokenResult ||
      !response.GenerateMembershipTokenResult.Message
    ) {
      loggerHandler(
        "Proceed getAccessToken - Failed",
        {
          ...dataLogger,
          error: `Incorrect response format! ${JSON.stringify(response)}`,
        },
        "error"
      );
      await Promise.reject(
        JSON.stringify({
          process: "nopCommerce integration",
          status: "failed",
        })
      );
    }

    //Not yet checking format accessToken from NC
    await appTokenModel.updateTokenByClient("nopCommerce", {
      accessToken: response.GenerateMembershipTokenResult.Message,
    });
    loggerHandler("Proceed getAccessToken from NopCommerce - Success", {
      ...dataLogger,
      response: JSON.stringify(response),
    });
    return {
      accessToken: response.GenerateMembershipTokenResult.Message || "",
      storeId: appToken.configuration.storeId,
    };
  } catch (error) {
    loggerHandler(
      "End getAccessToken - Failed",
      {
        ...dataLogger,
        error: new Error(error),
      },
      "error"
    );
    return undefined;
  }
}

function loggerHandler(action, info, type = "log") {
  const loggerObj = {
    nopCommerceService: {
      path: nopCommerceAccessTokenUrl,
      layer: "nopCommerceService.getAccessToken",
      data: {
        membershipSecretKey: maskKeyRandomly(info.membershipSecretKey),
        storeId: info.storeId,
      },
    },
  };
  if (info.error) {
    loggerObj.nopCommerceService.error = info.error;
  }
  if (info.response) {
    loggerObj.nopCommerceService.response = info.response;
  }

  return info.error
    ? loggerService[`${type}`](
        loggerObj,
        { apiPath: nopCommerceAccessTokenUrl },
        action
      )
    : loggerService[`${type}`](loggerObj, action);
}

module.exports = {
  getAccessToken,
};
