require("dotenv").config();
const appConfig = require("../../../../config/appConfig");
const loggerService = require("../../../../logs/logger");
const { maskKeyRandomly } = require("../../../../utils/common");
const { getAccessToken } = require("./nopCommerceCommonService");
const ApiUtils = require("../../../../utils/apiUtils");

const nopCommerceLoginUrl = `${
  appConfig[`NOP_COMMERCE_URL_${process.env.APP_ENV.toUpperCase()}`]
}${appConfig.NOP_COMMERCE_LOGIN_PATH}`;

function loggerHandler(action, info, type = "log", ) {
  const loggerObj = {
    nopCommerceService: {
      path: nopCommerceLoginUrl,
      layer: "nopCommerceService.loginNopCommerce",
      data: {
        accessToken: maskKeyRandomly(info.accessToken) || undefined,
        storeId: info.storeId,
        email: info.email,
        password: maskKeyRandomly(info.password),
      },
    },
  };
  if (info.error) {
    loggerObj.nopCommerceService.error = info.error;
  }
  if (info.response) {
    loggerObj.nopCommerceService.response = info.response;
  }

  return loggerService[`${type}`](loggerObj, info.error ? {} : '', action);
}

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
  const dataLogger = {
    accessToken: maskKeyRandomly(accessTokenInfo.accessToken),
    storeId: accessTokenInfo.storeId,
    email: email,
    password: maskKeyRandomly(password),
  }
  try {
    loggerHandler("Start loginNopCommerce - Start", dataLogger);
    const response = await ApiUtils.makeRequest(
      nopCommerceLoginUrl,
      "post",
      {},
      body
    );
    let rsHandler = ApiUtils.handleResponse(response);

    //retry one time when token is expired
    if (rsHandler && rsHandler.message === "Token Expired!") {
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
    loggerHandler("End loginNopCommerce Service - Success", {
      ...dataLogger,
      response: rsHandler
    });
    return rsHandler;
  } catch (error) {
    loggerHandler("End loginNopCommerce Service - Failed", {
      ...dataLogger,
      error
    }, 'error');
    return undefined;
  }
}

module.exports = {
  loginNopCommerce,
};
