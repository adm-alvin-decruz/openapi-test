/**
 * This service should use to process membership related only
 * Process response after getting the result from cognito
 */

// use dotenv
require('dotenv').config();
const cognitoService = require('../../services/cognitoService');
const MembershipErrors = require('../../config/https/errors/membershipErrors');
const { messageLang } = require('../../utils/common');
const { GROUP } = require('../../utils/constants');
const userModel = require('../../db/models/userModel');
const configsModel = require('../../db/models/configsModel');
const loggerService = require('../../logs/logger');
const escape = require('escape-html');

function success({ mid, email, group, isMatchedGroup, mandaiId, lang }) {
  return mid === true
    ? {
        membership: {
          group: {
            [`${group}`]: isMatchedGroup,
          },
          code: 200,
          mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS',
          message: messageLang('membership_get_success', lang),
          email: email,
          mandaiId: mandaiId,
        },
        status: 'success',
        statusCode: 200,
      }
    : {
        membership: {
          group: {
            [`${group}`]: isMatchedGroup,
          },
          code: 200,
          mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS',
          message: messageLang('membership_get_success', lang),
          email: email,
        },
        status: 'success',
        statusCode: 200,
      };
}

async function passesByGroup(group) {
  let passes = '';
  switch (group) {
    case GROUP.WILD_PASS: {
      passes = [`${GROUP.WILD_PASS}`];
      break;
    }
    case GROUP.MEMBERSHIP_PASSES: {
      const passesSupported = await configsModel.findByConfigKey('membership-passes', 'pass-type');
      passes =
        passesSupported && passesSupported.value && passesSupported.value.length > 0
          ? passesSupported.value
          : '';
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
    // Validate that at least email or mandaiId is provided
    if (!reqBody.email && !reqBody.mandaiId) {
      return {
        membership: {
          code: 400,
          mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_INVALID_INPUT',
          message: messageLang('email_no_record', reqBody.language),
          email: '',
        },
        status: 'failed',
        statusCode: 400,
      };
    }

    //1st priority check membership group: DB
    const passes = await passesByGroup(reqBody.group);

    //find userPasses have linked with user_memberships passkit
    const userPasses = await userModel.findPassesByUserEmailOrMandaiId(
      passes,
      reqBody.email || null,
      reqBody.mandaiId || null,
    );

    //find user info matched at users model - might have not linked memberships
    const userInfo = await userModel.findByEmailOrMandaiId(
      reqBody.email || null,
      reqBody.mandaiId || null,
    );

    if (userPasses && userPasses.length > 0) {
      //cover for case user signup with WP then signup with MP
      const groups =
        reqBody.group === GROUP.MEMBERSHIP_PASSES && userInfo
          ? await getCognitoGroups(userInfo, reqBody)
          : [];
      return success({
        mid: reqBody.mid,
        group: reqBody.group,
        email: reqBody.email,
        mandaiId: reqBody.mandaiId || (userInfo ? userInfo.mandai_id : null),
        lang: reqBody.language,
        isMatchedGroup:
          reqBody.group === GROUP.MEMBERSHIP_PASSES
            ? groups.filter((gr) => gr.GroupName === reqBody.group).length > 0
            : checkMatchedGroup(userPasses),
      });
    }
    // Handle case user not found in user_memberships
    if (!userInfo || !userInfo.email) {
      return {
        membership: {
          code: 200,
          mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_NULL',
          message: messageLang('email_no_record', reqBody.language),
          email: escape(reqBody.email),
        },
        status: 'failed',
        statusCode: 200,
      };
    }

    //cover for case user signup with membership-passes only - 2nd priority check group on Cognito
    const groups = await getCognitoGroups(userInfo, reqBody);

    return success({
      mid: reqBody.mid,
      group: reqBody.group,
      email: reqBody.email,
      mandaiId: reqBody.mandaiId || userInfo.mandai_id,
      lang: reqBody.language,
      isMatchedGroup: groups.filter((gr) => gr.GroupName === reqBody.group).length > 0,
    });
  } catch (error) {
    loggerService.error(
      {
        membership: {
          action: 'checkUserMembership',
          request: reqBody,
          layer: 'membershipsService.checkUserMembership',
          error: new Error(error),
        },
      },
      {},
      '[CIAM] End Check User Membership - Failed',
    );
    throw new Error(
      JSON.stringify(MembershipErrors.ciamMembershipUserNotFound(reqBody.email, reqBody.language)),
    );
  }
}

//Get Groups from Cognito
async function getCognitoGroups(userInfo, reqBody) {
  try {
    //push this error to catch wrapper if user not found

    //2nd priority check membership group: Cognito phase2 (user signup is added into Cognito group)
    const groupsCognitoInfo = await cognitoService.cognitoAdminListGroupsForUser(userInfo.email);

    return groupsCognitoInfo.Groups && groupsCognitoInfo.Groups.length > 0
      ? groupsCognitoInfo.Groups
      : [];
  } catch {
    throw new Error(
      JSON.stringify(MembershipErrors.ciamMembershipUserNotFound(reqBody.email, reqBody.language)),
    );
  }
}

/** export the module */
module.exports = {
  checkUserMembership,
};
