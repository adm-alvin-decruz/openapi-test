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
const userMembershipModel = require("../../db/models/userMembershipModel");
const CommonErrors = require("../../config/https/errors/common");
const loggerService = require("../../logs/logger");

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

//Check user membership group in Cognito [membership-passes, wildpass]
async function checkUserMembership(reqBody) {
  //1st: check membership group: Cognito
  try {
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
    const errorMessage = JSON.parse(error.message);
    const errorData =
      errorMessage.data && errorMessage.data.name ? errorMessage.data : "";
    //step 2nd is not exists at Cognito: query in db
    if (errorData.name && errorData.name === "UserNotFoundException") {
      const userInfo = await userModel.findByEmail(reqBody.email);
      if (!userInfo || !userInfo.id) {
        throw new Error(
          JSON.stringify(
            MembershipErrors.ciamMembershipUserNotFound(
              reqBody.email,
              reqBody.language
            )
          )
        );
      }
      const userMembership =
        reqBody.group === GROUP.WILD_PASS
          ? await userMembershipModel.findByUserIdAndGroup(
              userInfo.id,
              "wildpass"
            )
          : await userMembershipModel.findByUserIdAndExcludeGroup(
              userInfo.id,
              "wildpass"
            );
      if (userMembership && userMembership.length > 0) {
        return success({
          mid: reqBody.mid,
          group: reqBody.group,
          email: reqBody.email,
          mandaiId:
            !!userInfo && userInfo.mandai_id ? userInfo.mandai_id : null,
          lang: reqBody.language,
          isMatchedGroup: true,
        });
      }
      return success({
        mid: reqBody.mid,
        group: reqBody.group,
        email: reqBody.email,
        mandaiId: !!userInfo && userInfo.mandai_id ? userInfo.mandai_id : null,
        lang: reqBody.language,
        isMatchedGroup: false,
      });
    }
    loggerService.error(
      `membershipsService.checkUserMembership Error: ${error}`
    );
    throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
  }
}

/** export the module */
module.exports = {
  checkUserMembership,
};
