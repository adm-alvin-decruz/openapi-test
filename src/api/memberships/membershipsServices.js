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
async function checkUserMembership({
  email = null,
  mandaiId = null,
  group,
  mid,
  language = 'en',
}) {
  try {
    //1st priority check membership group: DB
    const passes = await passesByGroup(group);

    //find userPasses have linked with user_memberships passkit
    const userPasses = await userModel.findPassesByUserEmailOrMandaiId(passes, email, mandaiId);

    //find user info matched at users model - might have not linked memberships
    const userInfo = await userModel.findByEmailOrMandaiId(email, mandaiId);

    if (userPasses && userPasses.length > 0) {
      //cover for case user signup with WP then signup with MP
      const groups =
        group === GROUP.MEMBERSHIP_PASSES && userInfo
          ? await getCognitoGroups(userInfo.email, language)
          : [];
      return success({
        mid,
        group,
        email,
        mandaiId: mandaiId || (userInfo ? userInfo.mandai_id : null),
        lang: language,
        isMatchedGroup:
          group === GROUP.MEMBERSHIP_PASSES
            ? groups.filter((gr) => gr.GroupName === group).length > 0
            : checkMatchedGroup(userPasses),
      });
    }
    // Handle case user not found in user_memberships
    if (!userInfo || !userInfo.email) {
      return {
        membership: {
          code: 200,
          mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_NULL',
          message: messageLang('email_no_record', language),
          email: escape(email),
        },
        status: 'failed',
        statusCode: 200,
      };
    }

    //cover for case user signup with membership-passes only - 2nd priority check group on Cognito
    const groups = await getCognitoGroups(userInfo.email, language);

    return success({
      mid,
      group,
      email,
      mandaiId: mandaiId || userInfo.mandai_id,
      lang: language,
      isMatchedGroup: groups.filter((gr) => gr.GroupName === group).length > 0,
    });
  } catch (error) {
    loggerService.error(
      {
        membership: {
          action: 'checkUserMembership',
          request: { email, mandaiId, group, mid, language },
          layer: 'membershipsService.checkUserMembership',
          error: new Error(error),
        },
      },
      {},
      '[CIAM] End Check User Membership - Failed',
    );
    throw new Error(
      JSON.stringify(MembershipErrors.ciamMembershipUserNotFound(email, language)),
    );
  }
}

//Get Groups from Cognito
async function getCognitoGroups(email, language = 'en') {
  try {
    //2nd priority check membership group: Cognito phase2 (user signup is added into Cognito group)
    const groupsCognitoInfo = await cognitoService.cognitoAdminListGroupsForUser(email);

    return groupsCognitoInfo.Groups && groupsCognitoInfo.Groups.length > 0
      ? groupsCognitoInfo.Groups
      : [];
  } catch {
    throw new Error(
      JSON.stringify(MembershipErrors.ciamMembershipUserNotFound(email, language)),
    );
  }
}

/** export the module */
module.exports = {
  checkUserMembership,
};
