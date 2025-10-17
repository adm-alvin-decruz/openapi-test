const userModel = require('../../../../db/models/userModel');
const { messageLang } = require('../../../../utils/common');
const loggerService = require('../../../../logs/logger');
const GetMembershipError = require('../../../../config/https/errors/membershipErrors');
const { preSignedURLS3 } = require('../../../../services/s3Service');
const { getCurrentUTCTimestamp } = require('../../../../utils/dateUtils');
const DeleteUserErrors = require('../../../../config/https/errors/deleteUserErrors');
const cognitoService = require('../../../../services/cognitoService');
const MembershipErrors = require('../../../../config/https/errors/membershipErrors');
const userEventAuditTrailService = require('../../userEventAuditTrailService');

function loggerWrapper(action, obj, type = 'logInfo') {
  if (type === 'error') {
    return loggerService.error({ servicePortal: { ...obj } }, {}, action);
  }

  return loggerService.log({ servicePortal: { ...obj } }, action);
}

//Search users
async function retrieveMembership(data) {
  const language = data.language;
  const email = data.email;

  //define query for model
  const rs = await userModel.retrieveMembership(email);

  if (!rs || !rs.email) {
    await Promise.reject(
      new Error(JSON.stringify(MembershipErrors.ciamMembershipUserNotFound(email, language))),
    );
  }

  try {
    const today = getCurrentUTCTimestamp().split(' ')[0];

    //Get active memberships ( Active = expires_at >= today  )
    const activeMemberships = rs.memberships.filter(
      (ele) => ele.expires_at && ele.expires_at.split(' ')[0] >= today,
    );

    const memberships = await Promise.all(
      activeMemberships.map(async (ele) => {
        // Generate signed URL for photoUrl if it exists ,otherwise set it to an empty string
        const signedURL = ele.photoUrl ? await preSignedURLS3(ele.photoUrl) : '';

        return {
          ...ele,
          photoUrl: signedURL,
        };
      }),
    );

    return {
      user_memberships: {
        ...rs,
        memberships,
      },
      mwgCode: 'MWG_CIAM_GET_USER_MEMBERSHIPS_SUCCESS',
      message: messageLang('get_membership_success', language),
      status: 'success',
      statusCode: 200,
    };
  } catch (error) {
    loggerWrapper(
      '[CIAM-MYACCOUNT] Error Retrieve Memberships',
      { email, error: new Error(error), layer: 'service.retrieveMembership' },
      'error',
    );
    throw new Error(JSON.stringify(GetMembershipError.ciamMembershipGetPassesInvalid(language)));
  }
}

//Delete users
async function deleteUserMembership(data) {
  const language = data.language;
  const email = data.email;
  try {
    //define query for model
    const rs = await userModel.retrieveMembership(email);

    if (!rs || !rs.email) {
      await Promise.reject(
        new Error(JSON.stringify(MembershipErrors.ciamMembershipUserNotFound(email, language))),
      );
    }

    if (rs.memberships.length > 0) {
      const membershipExpireDateHasValue = rs.memberships.filter((ele) => !!ele.expires_at);

      const hasActiveMembership = membershipExpireDateHasValue.some((ele) => {
        return ele.expires_at.split(' ')[0] >= getCurrentUTCTimestamp().split(' ')[0];
      });

      if (hasActiveMembership) {
        await Promise.reject(
          new Error(JSON.stringify(DeleteUserErrors.ciamDeleteUserUnable(language))),
        );
      }
    }
    //proceed delete
    await userModel.softDeleteUserByEmail(email, {
      email: `deleted-${email}`,
      status: 2,
    });

    await cognitoService.cognitoDisabledUser(email);
    await userEventAuditTrailService.createEvent(
      email,
      'success',
      'deleteUser',
      {
        email,
      },
      1,
    );
    return {
      user_memberships: rs,
      mwgCode: 'MWG_CIAM_DELETE_USER_SUCCESS',
      message: messageLang('delete_user_success', language),
      status: 'success',
      statusCode: 200,
    };
  } catch (error) {
    await userEventAuditTrailService.createEvent(
      email,
      'failed',
      'deleteUser',
      {
        email,
      },
      1,
    );
    loggerWrapper(
      '[CIAM-MYACCOUNT] Error Delete User',
      { email, error: new Error(error), layer: 'service.deleteUserMembership' },
      'error',
    );
    throw new Error(JSON.stringify(DeleteUserErrors.ciamDeleteUserUnable(language)));
  }
}

/** export the module */
module.exports = {
  retrieveMembership,
  deleteUserMembership,
};
