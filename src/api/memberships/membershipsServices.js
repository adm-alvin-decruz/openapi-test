/**
 * This service should use to process membership related only
 * Process response after getting the result from cognito
 */

// use dotenv
require("dotenv").config();
const cognitoService = require("../../services/cognitoService");
const MembershipErrors = require("../../config/https/errors/membershipErrors");
const { getOrCheck } = require("../../utils/cognitoAttributes");
const { messageLang } = require("../../utils/common");
const { GROUP } = require("../../utils/constants");
const userModel = require("../../db/models/userModel");
const loggerService = require("../../logs/logger");
const appConfig = require("../../config/appConfig");

function success({ mid, email, group, isMatchedGroup, mandaiId, lang }) {
  return mid === true
    ? {
        membership: {
          group: {
            [`${group}`]: isMatchedGroup,
          },
          code: 200,
          mwgCode: "MWG_CIAM_USERS_MEMBERSHIP_SUCCESS",
          message: messageLang("membership_get_success", lang),
          email: email,
          mandaiId: !!mandaiId ? mandaiId : null,
        },
        status: "success",
        statusCode: 200,
      }
    : {
        membership: {
          group: {
            [`${group}`]: isMatchedGroup,
          },
          code: 200,
          mwgCode: "MWG_CIAM_USERS_MEMBERSHIP_SUCCESS",
          message: messageLang("membership_get_success", lang),
          email: email,
        },
        status: "success",
        statusCode: 200,
      };
}

function passesByGroup(group) {
  let passes = "";
  switch (group) {
    case GROUP.WILD_PASS: {
      passes = [`${GROUP.WILD_PASS}`];
      break;
    }
    case GROUP.MEMBERSHIP_PASSES: {
      passes = appConfig.MEMBERSHIP_PASSES;
      break;
    }
    default: {
      return;
    }
  }
  return passes;
}

function checkMatchedGroup(data) {
  if (data.length) {
    return data.filter((passes) => passes.isBelong === 1).length > 0;
  }
  return false;
}

//Check user membership group in Cognito [membership-passes, wildpass]
async function checkUserMembership(reqBody) {
  //1st priority check membership group: DB
  try {
    const passes = passesByGroup(reqBody.group);
    const userPasses = await userModel.findPassesByUserEmail(
      passes,
      reqBody.email
    );

    if (userPasses && userPasses.length > 0) {
      return success({
        mid: reqBody.mid,
        group: reqBody.group,
        email: reqBody.email,
        mandaiId: userPasses[0].mandaiId ? userPasses[0].mandaiId : null,
        lang: reqBody.language,
        isMatchedGroup: checkMatchedGroup(userPasses),
      });
    }

    //2nd priority check membership group: Cognito phase2 (user signup is added into Cognito group)
    const groupsCognitoInfo =
      await cognitoService.cognitoAdminListGroupsForUser(reqBody.email);
    const userCognito = await cognitoService.cognitoAdminGetUserByEmail(
      reqBody.email
    );
    const mandaiId = getOrCheck(userCognito, "custom:mandai_id");
    const groups =
      groupsCognitoInfo.Groups && groupsCognitoInfo.Groups.length > 0
        ? groupsCognitoInfo.Groups
        : [];

    return success({
      mid: reqBody.mid,
      group: reqBody.group,
      email: reqBody.email,
      mandaiId: !!mandaiId ? mandaiId : null,
      lang: reqBody.language,
      isMatchedGroup:
        groups.filter((gr) => gr.GroupName === reqBody.group).length > 0,
    });
  } catch (error) {
    loggerService.error(
      `membershipsService.checkUserMembership Error: ${error}`
    );
    throw new Error(
      JSON.stringify(
        MembershipErrors.ciamMembershipUserNotFound(
          reqBody.email,
          reqBody.language
        )
      )
    );
  }
}

/** export the module */
module.exports = {
  checkUserMembership,
};
