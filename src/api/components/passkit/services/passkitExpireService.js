require("dotenv").config();
const appConfig = require("../../../../config/appConfig");
const ApiUtils = require("../../../../utils/apiUtils");
const loggerService = require("../../../../logs/logger");
const passkitCommonService = require("./passkitCommonService");
const { getCurrentUTCTimestamp } = require("../../../../utils/dateUtils");

const passkitExpireEndpoint = `${
  appConfig[`PASSKIT_URL_${process.env.APP_ENV.toUpperCase()}`]
}${appConfig.PASSKIT_EXPIRE_URL_PATH}`;

function createRequestBody(req, userInfo) {
  return {
    passType: req.body.passType,
    name: `${userInfo.firstName} ${userInfo.lastName}`,
    mandaiId: req.body.mandaiId,
    visualId: req.body.visualId,
    dateOfBirth: userInfo.dob || null,
    expiryDate: getCurrentUTCTimestamp(),
    membershipType: userInfo.membershipType,
    familyMembers:
        userInfo.familyMembers.length > 0
        ? userInfo.familyMembers.map(
            (member) => `${member.firstName} ${member.lastName}`
          )
        : [],
  };
}

async function triggerPasskitExpire(req, userInfo) {
  const body = createRequestBody(req, userInfo);
  loggerService.log(
    {
      passkitComponent: {
        data: JSON.stringify(body),
        action: "triggerPasskitExpire",
        layer: "passkitCommonService.triggerPasskitExpire",
      },
    },
    "Start triggerPasskitExpire Service"
  );

  try {
    const headers = await passkitCommonService.setPasskitReqHeader();
    const response = await ApiUtils.makeRequest(
      passkitExpireEndpoint,
      "post",
      headers,
      body
    );
    const rsHandler = ApiUtils.handleResponse(response);
    loggerService.log(
      {
        passkitComponent: {
          action: "triggerPasskitExpire",
          layer: "passkitCommonService.triggerPasskitExpire",
          response: `${response}`,
        },
      },
      "End triggerPasskitExpire Service - Success"
    );
    return rsHandler;
  } catch (error) {
    loggerService.error(
      {
        passkitComponent: {
          data: JSON.stringify(body),
          action: "triggerPasskitExpire",
          layer: "passkitCommonService.triggerPasskitExpire",
          error: new Error("error :", error),
        },
      },
      {
        url: passkitExpireEndpoint,
        method: "post",
      },
      "End triggerPasskitExpire Service - Failed"
    );
    return undefined;
  }
}

module.exports = {
  triggerPasskitExpire,
};
