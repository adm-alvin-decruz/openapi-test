require("dotenv").config();
const appConfig = require("../../../../config/appConfig");
const loggerService = require("../../../../logs/logger");
const { maskKeyRandomly } = require("../../../../utils/common");
const { getAccessToken } = require("./nopCommerceCommonService");
const ApiUtils = require("../../../../utils/apiUtils");

const nopCommerceLoginUrl = `${
  appConfig[`NOP_COMMERCE_URL_${process.env.APP_ENV.toUpperCase()}`]
}${appConfig.NOP_COMMERCE_LOGIN_PATH}`;

function generateBodyRequest(email, password, accessToken, storeId) {
  return {
    token: accessToken,
    storeId: storeId,
    userName: email,
    password: password,
    isGuestCustomerId: "0",
  };
}
/**
 * handle login process
 * @param email
 * @param password
 * @return {Promise<{
 *     "MembershipLoginResult": {
 *         "CustomerId": string,
 *         "EmailId": string,
 *         "IsValid": boolean,
 *         "Message": "3420|Login Success",
 *         "RememberMe": boolean,
 *         "UserName": string
 *     }
 * }>}
 */
async function loginNopCommerce(email, password) {
  let accessTokenInfo = await getAccessToken();
  let body = generateBodyRequest(
    email,
    password,
    accessTokenInfo.accessToken,
    accessTokenInfo.storeId
  );
  try {
    loggerService.log(
      {
        nopCommerceService: {
          path: nopCommerceLoginUrl,
          layer: "nopCommerceService.loginNopCommerce",
          data: {
            token: maskKeyRandomly(accessTokenInfo.accessToken),
            storeId: accessTokenInfo.storeId,
            email: email,
            password: maskKeyRandomly(password),
          },
        },
      },
      "Start loginNopCommerce - Start"
    );

    const response = await ApiUtils.makeRequest(
      nopCommerceLoginUrl,
      "post",
      {},
      body
    );
    let rsHandler = ApiUtils.handleResponse(response);

    //retry one time when token is expired
    if (rsHandler && rsHandler.message === 'Token Expired!') {
      accessTokenInfo = await getAccessToken(true);
      body.accessToken = accessTokenInfo.accessToken;
      const requestAgain = await ApiUtils.makeRequest(
        nopCommerceLoginUrl,
        "post",
        {},
        body
      );
      rsHandler = ApiUtils.handleResponse(requestAgain);
    } else {
      rsHandler = response;
    }
    loggerService.log(
      {
        passkitComponent: {
          action: "retrievePasskit",
          layer: "passkitCommonService.retrievePasskit",
          response: JSON.stringify(response),
        },
      },
      "End loginNopCommerce Service - Success"
    );

    return rsHandler;
  } catch (error) {
    loggerService.error(
      {
        nopCommerceService: {
          path: nopCommerceLoginUrl,
          layer: "nopCommerceService.retrieveMembershipPhoto",
          data: {
            token: maskKeyRandomly(accessTokenInfo.accessToken) || undefined,
            storeId: accessTokenInfo.storeId,
            email: email,
            password: maskKeyRandomly(password),
          },
          error: new Error(error),
        },
      },
      {},
      "End loginNopCommerce Service - Failed"
    );
    return undefined;
  }
}

module.exports = {
  loginNopCommerce,
};
