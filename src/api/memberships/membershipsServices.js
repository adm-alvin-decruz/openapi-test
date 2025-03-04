/**
 * This service should use to process membership related only
 * Process response after getting the result from cognito
 */

// use dotenv
require("dotenv").config();
const cognitoService = require("../../services/cognitoService");
const MembershipErrors = require("../../config/https/errors/membershipErrors");
const { messageLang } = require("../../utils/common");
const { GROUP } = require("../../utils/constants");
const userModel = require("../../db/models/userModel");
const configsModel = require("../../db/models/configsModel");
const loggerService = require("../../logs/logger");

function success({ mid, email, group, isMatchedGroup, mandaiId, lang }) {
  return mid === true
    ? {
        membership: {
          group: {
            [`${group}`]: isMatchedGroup,
          },
          code: 200,
          mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS",
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
          mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS",
          message: messageLang("membership_get_success", lang),
          email: email,
        },
        status: "success",
        statusCode: 200,
      };
}

async function passesByGroup(group) {
  let passes = "";
  switch (group) {
    case GROUP.WILD_PASS: {
      passes = [`${GROUP.WILD_PASS}`];
      break;
    }
    case GROUP.MEMBERSHIP_PASSES: {
      const passesSupported = await configsModel.findByConfigKey(
        "membership-passes",
        "pass-type"
      );
      passes =
        passesSupported &&
        passesSupported.value &&
        passesSupported.value.length > 0
          ? passesSupported.value
          : "";
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
  try {
    //1st priority check membership group: DB
    const passes = await passesByGroup(reqBody.group);
    const userPasses = await userModel.findPassesByUserEmailOrMandaiId(
      passes,
      reqBody.email,
      reqBody.mandaiId
    );

    //2nd priority check membership group: Cognito phase2 (user signup is added into Cognito group)
    const groupsCognitoInfo =
        await cognitoService.cognitoAdminListGroupsForUser(userPasses[0].email);
    const groups =
        groupsCognitoInfo.Groups && groupsCognitoInfo.Groups.length > 0
            ? groupsCognitoInfo.Groups
            : [];

    return success({
      mid: reqBody.mid,
      group: reqBody.group,
      email: reqBody.email,
      mandaiId: userPasses && userPasses.length > 0 ? userPasses[0].mandaiId : null,
      lang: reqBody.language,
      isMatchedGroup: checkMatchedGroup(userPasses) ||
        groups.filter((gr) => gr.GroupName === reqBody.group).length > 0,
    });
  } catch (error) {
    loggerService.error(
      {
        membership: {
          action: "checkUserMembership",
          request: reqBody,
          layer: "membershipsService.checkUserMembership",
          error: new Error(error),
        },
      },
      {},
      "[CIAM] End Check User Membership - Failed"
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
