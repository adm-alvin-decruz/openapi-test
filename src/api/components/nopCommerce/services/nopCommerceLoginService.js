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
  const accessTokenInfo = await getAccessToken();
  let body = generateBodyRequest(
    email,
    password,
    accessTokenInfo.accessToken,
    accessTokenInfo.storeId
  );
  const dataLogger = {
    token: maskKeyRandomly(accessTokenInfo.accessToken),
    storeId: accessTokenInfo.storeId,
    email: email,
    password: maskKeyRandomly(password),
  };
  try {
    loggerHandler("Start loginNopCommerce - Start", dataLogger);
    const response = await ApiUtils.makeRequest(
      nopCommerceLoginUrl,
      "post",
      {},
      body
    );

    //retry one time when token is expired
    if (response && response.message === "Token Expired!") {
      const newAccessToken = await getAccessToken(true);
      body.token = newAccessToken.accessToken;
      dataLogger.token = newAccessToken.accessToken;
      const requestAgain = await ApiUtils.makeRequest(
        nopCommerceLoginUrl,
        "post",
        {},
        body
      );
      loggerHandler("End loginNopCommerce Service - Success", {
        ...dataLogger,
        response: JSON.stringify(requestAgain.MembershipLoginResult),
      });
      return requestAgain;
    }
    loggerHandler("End loginNopCommerce Service - Success", {
      ...dataLogger,
      response: JSON.stringify(response),
    });
    return response;
  } catch (error) {
    loggerHandler(
      "End loginNopCommerce Service - Failed",
      {
        ...dataLogger,
        error,
      },
      "error"
    );
    return undefined;
  }
}

function loggerHandler(action, info, type = "log") {
  const loggerObj = {
    nopCommerceService: {
      path: nopCommerceLoginUrl,
      layer: "nopCommerceService.loginNopCommerce",
      data: {
        token: maskKeyRandomly(info.token) || undefined,
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

  return info.error
    ? loggerService[`${type}`](
        loggerObj,
        { apiPath: nopCommerceLoginUrl },
        action
      )
    : loggerService[`${type}`](loggerObj, action);
}

module.exports = {
  loginNopCommerce,
};
