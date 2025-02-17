require("dotenv").config();
const appConfig = require("../../../../config/appConfig");
const ApiUtils = require("../../../../utils/apiUtils");
const axios = require("axios");
const loggerService = require("../../../../logs/logger");
const userMembershipModel = require("../../../../db/models/appTokenModel");

const nopCommerceAccessTokenUrl = `${
  appConfig[`NOP_COMMERCE_URL_${process.env.APP_ENV.toUpperCase()}`]
}${appConfig.NOP_COMMERCE_ACCESS_TOKEN_PATH}`;

const nopCommerceGetMembershipUrl = `${
  appConfig[`NOP_COMMERCE_URL_${process.env.APP_ENV.toUpperCase()}`]
}${appConfig.NOP_COMMERCE_GET_MEMBERSHIP_PATH}`;

/**
 * handle retrieve membership photo
 * @param pictureId
 * @return {Promise<string>}
 */
async function retrieveMembershipPhoto(pictureId) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return undefined;
  }
  try {
    loggerService.log(
      {
        nopCommerceService: {
          path: nopCommerceGetMembershipUrl,
          layer: "nopCommerceService.retrieveMembershipPhoto",
          data: {
            token: accessToken,
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
    //custom axios for workable with parse image stream
    const response = await axios.post(
      nopCommerceGetMembershipUrl,
      {
        token: accessToken,
        storeId: 1,
        pictureId: pictureId,
      },
      {
        responseType: "arraybuffer", // Get raw image buffer
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response || !response.data) {
      loggerService.error(
        {
          nopCommerceService: {
            layer: "nopCommerceService.retrieveMembershipPhoto",
            data: {
              token: accessToken,
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
            token: accessToken || undefined,
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
  try {
    const appToken = await userMembershipModel.getLatestToken("nopCommerce");
    if (
      !appToken ||
      !appToken.credentials ||
      !appToken.credentials.client_secret
    ) {
      return undefined;
    }
    loggerService.log(
      {
        nopCommerceService: {
          path: nopCommerceAccessTokenUrl,
          layer: "nopCommerceService.getAccessToken",
          data: {
            membershipSecretKey: appToken.credentials.client_secret,
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
    loggerService.log(
      {
        nopCommerceService: {
          path: nopCommerceAccessTokenUrl,
          layer: "nopCommerceService.getAccessToken",
          data: response,
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
            membershipSecretKey: "fa7xt2ak1g7i1cb1r7h118j114gf9",
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
