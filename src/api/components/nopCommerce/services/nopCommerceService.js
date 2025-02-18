require("dotenv").config();
const appConfig = require("../../../../config/appConfig");
const ApiUtils = require("../../../../utils/apiUtils");
const axios = require("axios");
const loggerService = require("../../../../logs/logger");
const appTokenModel = require("../../../../db/models/appTokenModel");
const { maskKeyRandomly } = require("../../../../utils/common");

const nopCommerceAccessTokenUrl = `${
  appConfig[`NOP_COMMERCE_URL_${process.env.APP_ENV.toUpperCase()}`]
}${appConfig.NOP_COMMERCE_ACCESS_TOKEN_PATH}`;

const nopCommerceGetMembershipUrl = `${
  appConfig[`NOP_COMMERCE_URL_${process.env.APP_ENV.toUpperCase()}`]
}${appConfig.NOP_COMMERCE_GET_MEMBERSHIP_PATH}`;

//custom axios for workable with parse image stream
async function callingNopCommerce(token, pictureId) {
  return await axios.post(
    nopCommerceGetMembershipUrl,
    {
      token,
      storeId: 1,
      pictureId,
    },
    {
      responseType: "arraybuffer", // Get raw image buffer
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

/**
 * handle retrieve membership photo
 * @param pictureId
 * @return {Promise<string>}
 */
async function retrieveMembershipPhoto(pictureId) {
  const appToken = await appTokenModel.getLatestToken("nopCommerce");
  let tokenNopCommerce = "";
  if (appToken && appToken.token && appToken.token.accessToken) {
    tokenNopCommerce = appToken.token.accessToken;
  } else {
    tokenNopCommerce = await getAccessToken();
  }
  try {
    loggerService.log(
      {
        nopCommerceService: {
          path: nopCommerceGetMembershipUrl,
          layer: "nopCommerceService.retrieveMembershipPhoto",
          data: {
            token: maskKeyRandomly(tokenNopCommerce),
            storeId: 1,
            pictureId: pictureId,
          },
          config: {
            responseType: "arraybuffer", // Get raw image buffer
            headers: {
              "Content-Type": "application/json",
            },
          },
        },
      },
      "Start retrieveMembershipPhoto"
    );

    let response = await callingNopCommerce(tokenNopCommerce, pictureId);

    //retry 1 time  for get new access token in case token expire
    if (
      !response ||
      !response.data ||
      !Buffer.from(response.data).toString("base64")
    ) {
      tokenNopCommerce = await getAccessToken();
      response = await callingNopCommerce(tokenNopCommerce, pictureId);
    }

    if (
      !response ||
      !response.data ||
      !Buffer.from(response.data).toString("base64")
    ) {
      loggerService.error(
        {
          nopCommerceService: {
            layer: "nopCommerceService.retrieveMembershipPhoto",
            data: {
              token: maskKeyRandomly(tokenNopCommerce),
              storeId: 1,
              pictureId: pictureId,
            },
            config: {
              responseType: "arraybuffer", // Get raw image buffer
              headers: {
                "Content-Type": "application/json",
              },
            },
          },
        },
        {
          apiPath: nopCommerceGetMembershipUrl,
        },
        "End retrieveMembershipPhoto - Failed"
      );
      return undefined;
    }
    // Get MIME type (adjust as needed)
    const mimeType = response.headers["content-type"] || "image/png"; // Default to PNG

    const base64Image = Buffer.from(response.data, "binary").toString("base64");

    loggerService.log(
      {
        nopCommerceService: {
          path: nopCommerceGetMembershipUrl,
          layer: "nopCommerceService.retrieveMembershipPhoto",
          data: {
            membershipPhoto: base64Image,
          },
        },
      },
      "End retrieveMembershipPhoto - Success"
    );

    // Create a Base64 data URI
    return `data:${mimeType};base64,${base64Image}`;
  } catch (error) {
    loggerService.error(
      {
        nopCommerceService: {
          path: nopCommerceGetMembershipUrl,
          layer: "nopCommerceService.retrieveMembershipPhoto",
          data: {
            token: maskKeyRandomly(tokenNopCommerce) || undefined,
            storeId: 1,
            pictureId: pictureId,
          },
          error: JSON.stringify(error),
        },
      },
      {},
      "End retrieveMembershipPhoto - Failed"
    );
    loggerService.log(`NopCommerceService.GetPictureImage Error: ${error}`);
    return undefined;
  }
}

async function getAccessToken() {
  const appToken = await appTokenModel.getLatestToken("nopCommerce");
  if (
    !appToken ||
    !appToken.credentials ||
    !appToken.credentials.client_secret
  ) {
    return undefined;
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
      "Start getAccessToken from NopCommerce"
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
      "End getAccessToken from NopCommerce - Success"
    );
    return response.GenerateMembershipTokenResult.Message || "";
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
            storeId: 1,
          },
          error: JSON.stringify(error),
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
  retrieveMembershipPhoto,
};
