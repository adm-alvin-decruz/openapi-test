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

  try {
    loggerService.log(
      {
        nopCommerceService: {
          path: nopCommerceAccessTokenUrl,
          layer: "nopCommerceService.getAccessToken",
          data: {
            membershipSecretKey: maskKeyRandomly(
              appToken.credentials.client_secret
            ),
            storeId: appToken.configuration.storeId,
          },
        },
      },
      "Proceed getAccessToken from NopCommerce"
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
      loggerService.error(
        {
          nopCommerceService: {
            path: nopCommerceAccessTokenUrl,
            layer: "nopCommerceService.getAccessToken",
            data: {
              membershipSecretKey: maskKeyRandomly(
                appToken.credentials.client_secret
              ),
              storeId: appToken.configuration.storeId,
            },
            error: `Incorrect response format! ${JSON.stringify(response)}`,
          },
        },
        {
          apiPath: nopCommerceAccessTokenUrl,
        },
        "Proceed getAccessToken - Failed"
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

    loggerService.log(
      {
        nopCommerceService: {
          path: nopCommerceAccessTokenUrl,
          layer: "nopCommerceService.getAccessToken",
        },
      },
      "Proceed getAccessToken from NopCommerce - Success"
    );
    return {
      accessToken: response.GenerateMembershipTokenResult.Message || "",
      storeId: appToken.configuration.storeId,
    };
  } catch (error) {
    loggerService.error(
      {
        nopCommerceService: {
          path: nopCommerceAccessTokenUrl,
          layer: "nopCommerceService.getAccessToken",
          data: {
            membershipSecretKey: maskKeyRandomly(
              appToken.credentials.client_secret
            ),
            storeId: appToken.configuration.storeId,
          },
          error: new Error(error),
        },
      },
      {
        apiPath: nopCommerceAccessTokenUrl,
      },
      "End getAccessToken - Failed"
    );
    return undefined;
  }
}

module.exports = {
  getAccessToken,
};
