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
const galaxyWPService = require('../../../components/galaxy/services/galaxyWPService');

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

  try {
    //define query for model
    const rs = await userModel.retrieveMembership(email);

    if (!rs || !rs.email) {
      await Promise.reject(
        new Error(JSON.stringify(MembershipErrors.ciamMembershipUserNotFound(email, language))),
      );
    }

    const today = getCurrentUTCTimestamp().split(' ')[0];

    // Filter memberships to include only active ones:
    // - Lifetime memberships (expires_at is null)
    // - Memberships that expire today or in the future (expires_at >= today)
    const activeMemberships = rs.memberships.filter(
      (ele) => !ele.expires_at || ele.expires_at.split(' ')[0] >= today,
    );

    const memberships = await Promise.all(
      activeMemberships.map(async ({ membershipType, photoUrl, ...restItem }) => {
        // generate signed URL for photoUrl if exists
        const signedURL = photoUrl ? await preSignedURLS3(photoUrl) : '';

        return {
          ...restItem,
          photoUrl: signedURL,
          // if membershipType is 'wildpass', set categoryType and itemName to indicate a Wildpass membership
          ...(membershipType === 'wildpass' && {
            categoryType: 'wildpass',
            // itemName must start with an uppercase 'W' for 'Wildpass'; do not modify this format
            itemName: 'Wildpass',
          }),
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
async function deleteUserMembership(req, user_perform_action) {
  const STATUS_WILD_PASS = {
    VOID: '1',
    VALID: '0',
  };

  const language = req.body.language;
  const email = req.body.email;

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

    // proceed update membership's WildPass status to 1 (void) in galaxy with error handling
    try {
      const { data: wpData } = await userModel.findWPFullData(email);
      const visualIdWpToUpdate = wpData?.visual_id;

      if (!visualIdWpToUpdate) {
        loggerWrapper('[CIAM-MYACCOUNT] No Wild Pass Memberships found to Update in Galaxy', {
          email,
          layer: 'service.deleteUserMembership.galaxyUpdate',
        });
      } else {
        const requiredFields = {
          visualId: visualIdWpToUpdate,
          firstName: rs.familyName,
          middleName: rs.givenName,
          lastName: rs.familyName,
          email: rs.email,
          // Format DOB to 'DD/MM/YYYY' for fit with galaxy input requirement
          dob: rs.birthdate ? new Date(rs.birthdate).toLocaleDateString('en-GB') : '',
        };

        await galaxyWPService.callMembershipUpdateStatus(requiredFields, STATUS_WILD_PASS.VOID);

        loggerWrapper('[CIAM-MYACCOUNT] Successfully Update Membership Status to Void in Galaxy', {
          email,
          layer: 'service.deleteUserMembership.galaxyUpdate',
        });
      }
    } catch (error) {
      loggerWrapper(
        '[CIAM-MYACCOUNT] Error Update Membership Status to Void in Galaxy',
        { email, error: new Error(error), layer: 'service.deleteUserMembership.galaxyUpdate' },
        'error',
      );
      throw new Error(JSON.stringify(DeleteUserErrors.ciamDeleteUserUnable(language)));
    }

    const deletedEmail = `deleted-${email}`;
    // update email user in cognito
    await cognitoService.cognitoAdminUpdateNewUser(
      [
        { Name: 'email', Value: deletedEmail },
        { Name: 'preferred_username', Value: deletedEmail },
      ],
      email,
    );
    // disable user in cognito
    await cognitoService.cognitoDisabledUser(deletedEmail);

    //proceed soft-delete in CIAM DB
    await userModel.softDeleteUserByEmail(email, {
      email: deletedEmail,
    });

    await userEventAuditTrailService.createEvent(
      email,
      'success',
      'AccountSoftDeletedByUser',
      {
        email,
        user_perform_action: user_perform_action ?? '',
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
      'AccountSoftDeletedByUser',
      {
        email,
        user_perform_action,
      },
      1,
    );
    loggerWrapper(
      '[CIAM-MYACCOUNT] Error Delete User',
      { email, error: new Error(error), layer: 'service.deleteUserMembership' },
      'error',
    );

    throw new Error(error.message);
  }
}
/** export the module */
module.exports = {
  retrieveMembership,
  deleteUserMembership,
};
