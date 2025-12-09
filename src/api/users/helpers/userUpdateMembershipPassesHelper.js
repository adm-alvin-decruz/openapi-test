const cognitoService = require('../../../services/cognitoService');
const { getOrCheck } = require('../../../utils/cognitoAttributes');
const UpdateUserErrors = require('../../../config/https/errors/updateUserErrors');
const userModel = require('../../../db/models/userModel');
const passwordService = require('../userPasswordService');
const loggerService = require('../../../logs/logger');
const { COGNITO_ATTRIBUTES } = require('../../../utils/constants');
const userDBService = require('../usersDBService');
const userCredentialModel = require('../../../db/models/userCredentialModel');
const { convertDateToMySQLFormat } = require('../../../utils/dateUtils');
const { parseCognitoAttributeObject } = require('../../../helpers/cognitoHelpers');

async function errorWrapper(errObj) {
  await Promise.reject(JSON.stringify(errObj));
}

function loggerWrapper(action, loggerObj, type = 'logInfo') {
  if (type === 'error') {
    return loggerService.error({ userUpdateHelper: { ...loggerObj } }, {}, action);
  }

  return loggerService.log({ userUpdateHelper: { ...loggerObj } }, action);
}

async function getUserFromDBCognito(email) {
  const userInfo = {
    db: null,
    cognito: null,
  };
  if (!email) {
    return userInfo;
  }

  try {
    const userDB = await userModel.findByEmail(email);
    const userCognito = await cognitoService.cognitoAdminGetUserByEmail(email);
    if (userDB && userDB.id) {
      userInfo.db = userDB;
    }
    if (userCognito && getOrCheck(userCognito, 'email')) {
      userInfo.cognito = parseCognitoAttributeObject(userCognito);
    }
    return userInfo;
  } catch (error) {
    console.log('getUserFromDBCognito error: ', error);
    return userInfo;
  }
}

function isUserExisted(userInfo) {
  return userInfo && userInfo.db && userInfo.cognito;
}

/**
 * Verifies the current and new email addresses of a user.
 *
 * @async
 * @function
 * @param {string} originalEmail - The original email address of the user.
 * @param {Object} userInfoOriginal - The user information associated with the original email.
 * @param {string} newEmail - The new email address to be verified.
 * @param {Object} userInfoNewEmail - The user information associated with the new email.
 * @param {string} language - The language preference for verification messages.
 * @returns {Promise<boolean>} - A promise that resolves to `true` if verification is successful, otherwise `false`.
 */
async function verifyCurrentAndNewEmail({
  originalEmail,
  userInfoOriginal,
  newEmail,
  userInfoNewEmail,
  language,
}) {
  try {
    // If original email not existed - throw error record not found
    if (!isUserExisted(userInfoOriginal)) {
      await errorWrapper(UpdateUserErrors.ciamEmailNotExists(originalEmail, language));
    }

    // If new email is existed - throw error account being user by other
    if (newEmail) {
      if (isUserExisted(userInfoNewEmail)) {
        await errorWrapper(UpdateUserErrors.ciamNewEmailBeingUsedErr(newEmail, language));
      }
    }
  } catch (error) {
    throw new Error(error);
  }
}

/**
 * Update user password at Cognito.
 *
 * @async
 * @function
 * @param {string} email - The email address to be verified.
 * @param {Object} password - The password information associated ncRequest or normal flow.
 * @param {string} language - The language preference for verification messages.
 */
async function updateCognitoUserPassword({ email, password, language }) {
  try {
    await cognitoService.cognitoAdminSetUserPassword(email, password.cognito);
    loggerWrapper(
      '[CIAM-MAIN] userUpdateMembershipPassesHelper.updateCognitoUserPassword Update Password Success',
      {
        userEmail: email,
        layer: 'userUpdateMembershipPassesHelper.updateCognitoUserPassword',
      },
    );
  } catch (error) {
    loggerWrapper(
      '[CIAM-MAIN] userUpdateMembershipPassesHelper.updateCognitoUserPassword Update Password Success',
      {
        userEmail: email,
        layer: 'userUpdateMembershipPassesHelper.updateCognitoUserPassword',
        error: new Error(error),
      },
      'error',
    );
    //throw error moving to top try catch block
    throw new Error(JSON.stringify(UpdateUserErrors.ciamUpdateUserErr(language)));
  }
}

async function manipulatePassword(
  ncRequest,
  passwordFromNC = undefined,
  passwordFromRequest = undefined,
) {
  let passwordHash = undefined;

  if (ncRequest && passwordFromNC) {
    passwordHash = await passwordService.hashPassword(passwordFromNC.toString());
    return {
      db: passwordHash,
      cognito: passwordFromNC,
    };
  }

  if (passwordFromRequest) {
    passwordHash = await passwordService.hashPassword(passwordFromRequest.toString());
    return {
      db: passwordHash,
      cognito: passwordFromRequest,
    };
  }

  return {
    db: passwordHash,
    cognito: undefined,
  };
}

/**
 * Update user information at Cognito.
 *
 * @async
 * @function
 * @param {Object} data - The data request updated.
 * @param {Object} userInfo - The user information associated with email.
 * @param {string} email - The email string verify.
 * @param {string} newEmail - The new email updated.
 * @param {string} language - The language preference for verification messages.
 */
async function updateCognitoUserInfo({ data, userInfo, email, newEmail, language }) {
  /*
    prepare replace user's name at Cognito
     handle replace username at cognito by firstName + lastName
   */
  let userName = userInfo.name;
  const userFirstName = userInfo.given_name;
  const userLastName = userInfo.family_name;
  const emailReplicate = newEmail || email;

  if (data.firstName && userFirstName) {
    userName = userName.replace(userFirstName.toString(), data.firstName);
  }
  if (data.lastName && userLastName) {
    userName = userName.replace(userLastName.toString(), data.lastName);
  }

  //prepare params attributes for Cognito
  //filter attributes that support from our Cognito schemas only
  const cognitoParams = Object.keys(data)
    .map((key) => {
      //ignore params which not being used for update data
      if (['uuid', 'newPassword', 'confirmPassword', 'oldPassword', 'group'].includes(key)) {
        return;
      }
      if (key === 'newsletter') {
        return {
          Name: COGNITO_ATTRIBUTES[key],
          Value: JSON.stringify(data.newsletter),
        };
      }
      if (key === 'phoneNumber') {
        return {
          Name: COGNITO_ATTRIBUTES[key],
          Value: data.phoneNumber,
        };
      }

      return {
        Name: COGNITO_ATTRIBUTES[key],
        Value: data[key],
      };
    })
    .filter((ele) => !!ele && !!ele.Name);

  try {
    let cognitoUpdateParams = [
      ...cognitoParams,
      { Name: 'name', Value: userName },
      {
        Name: 'email',
        Value: emailReplicate,
      },
    ];
    if (
      data.phoneNumber === null ||
      data.phoneNumber === undefined ||
      data.phoneNumber.trim() === ''
    ) {
      // find the index of the phone_number parameter
      const phoneIndex = cognitoUpdateParams.findIndex(
        (cognitoUpdateParams) => cognitoUpdateParams.Name === 'phone_number',
      );
      // remove the phone_number parameter if found
      if (phoneIndex !== -1) {
        cognitoUpdateParams.splice(phoneIndex, 1);
      }
    }
    loggerWrapper('[CIAM-MAIN] Process Update User At Cognito - Start', {
      userEmail: email,
      layer: 'userUpdateMembershipPassesHelper.updateCognitoUserInfo',
      cognitoUpdateParams: JSON.stringify(cognitoUpdateParams),
    });
    await cognitoService.cognitoAdminUpdateNewUser(cognitoUpdateParams, email);
    loggerWrapper('[CIAM-MAIN] Process Update User At Cognito - Start - Success', {
      userEmail: email,
      layer: 'userUpdateMembershipPassesHelper.updateCognitoUserInfo',
    });
  } catch (error) {
    loggerWrapper(
      '[CIAM-MAIN] Process Update User At Cognito - Start - Failed',
      {
        userEmail: email,
        layer: 'userUpdateMembershipPassesHelper.updateCognitoUserInfo',
        error: new Error(error),
      },
      'error',
    );
    throw new Error(JSON.stringify(UpdateUserErrors.ciamUpdateUserErr(language)));
  }
}

/**
 * Update user information at Cognito.
 *
 * @async
 * @function
 * @param {string} email - The email string verify.
 * @param {string} newEmail - The new email updated.
 * @param {Object} data - The data request updated.
 * @param {string} userId - The userId from DB.
 * @param {Object} password - password information after manipulated
 * @param {string} language - The language preference for verification messages.
 */
async function updateDBUserInfo({ email, newEmail, data, userId, password, language, otpEmailDisabledUntil }) {
  const latestEmail = newEmail || email;

  try {
    loggerWrapper('[CIAM-MAIN] Update User table', {
      userEmail: latestEmail,
      layer: 'userUpdateMembershipPassesHelper.updateDB',
      data: JSON.stringify({
        given_name: data.firstName,
        family_name: data.lastName,
        birthdate: data.dob ? convertDateToMySQLFormat(data.dob) : undefined,
        email: latestEmail,
        otp_email_disabled_until: otpEmailDisabledUntil,
        singpass_uuid: data.singpassUuid,
      }),
    });
    //1st - Update user table - step is always proceed
    await userDBService.userModelExecuteUpdate(
      userId,
      data.firstName,
      data.lastName,
      data.dob,
      latestEmail,
      otpEmailDisabledUntil,
      data.singpassUuid || undefined,
    );

    loggerWrapper('[CIAM-MAIN] Update User Credentials table', {
      userEmail: latestEmail,
      layer: 'userUpdateMembershipPassesHelper.updateDB',
      data: JSON.stringify({
        password_hash: password.db,
        username: latestEmail,
      }),
    });
    //2nd - Update user credentials table - step is always proceed
    await userCredentialModel.updateByUserId(userId, {
      password_hash: password.db,
      username: latestEmail,
      salt: null,
    });

    //3rd - Update user newsletter table - step is need condition newsletter available
    if (data.newsletter && data.newsletter.name) {
      loggerWrapper('[CIAM-MAIN] Update User Newsletter table', {
        userEmail: latestEmail,
        layer: 'userUpdateMembershipPassesHelper.updateDB',
        data: JSON.stringify({
          userId: userId,
          newsletter: data.newsletter,
        }),
      });
      await userDBService.userNewsletterModelExecuteUpdate(userId, data.newsletter);
    }

    //4th - Update user details table - step is need condition phoneNumber/address/country available
    if (data.phoneNumber || data.address || data.country) {
      loggerWrapper('[CIAM-MAIN] Update User Details table', {
        userEmail: email,
        layer: 'userUpdateMembershipPassesHelper.updateDB',
        data: JSON.stringify({
          userId: userId,
          phone_number: data.phoneNumber ? data.phoneNumber : undefined,
          address: data.address,
          zoneinfo: data.country,
        }),
      });
      await userDBService.userDetailsModelExecuteUpdate(
        userId,
        data.phoneNumber,
        data.address,
        data.country,
      );
    }
    // await updateDB(data, userId, latestEmail, password, language);
    loggerWrapper('[CIAM-MAIN] Process update user at DB - Success', {
      userEmail: email,
      layer: 'userUpdateMembershipPassesHelper.updateDBUserInfo',
    });
  } catch (error) {
    loggerWrapper('[CIAM-MAIN] Process update user at DB - Failed', {
      userEmail: email,
      layer: 'userUpdateMembershipPassesHelper.updateDBUserInfo',
      error: new Error(error),
    });
    //throw error for service handle
    throw new Error(JSON.stringify(UpdateUserErrors.ciamUpdateUserErr(language)));
  }
}

module.exports = {
  verifyCurrentAndNewEmail,
  getUserFromDBCognito,
  updateCognitoUserPassword,
  updateDBUserInfo,
  manipulatePassword,
  updateCognitoUserInfo,
  isUserExisted,
};
