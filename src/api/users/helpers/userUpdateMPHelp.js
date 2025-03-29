const cognitoService = require("../../../services/cognitoService");
const { getOrCheck } = require("../../../utils/cognitoAttributes");
const UpdateUserErrors = require("../../../config/https/errors/updateUserErrors");
const userModel = require("../../../db/models/userModel");
const passwordService = require("../userPasswordService");
const loggerService = require("../../../logs/logger");
const { COGNITO_ATTRIBUTES } = require("../../../utils/constants");
const userDBService = require("../usersDBService");
const userCredentialModel = require("../../../db/models/userCredentialModel");
const { convertDateToMySQLFormat } = require("../../../utils/dateUtils");

async function errorWrapper(errObj) {
  await Promise.reject(JSON.stringify(errObj));
}

function loggerWrapper(action, loggerObj, type = "logInfo") {
  if (type === "error") {
    return loggerService.error(
      {
        userUpdateHelper: {
          ...loggerObj,
        },
      },
      {},
      action
    );
  }

  return loggerService.log(
    {
      userUpdateHelper: {
        ...loggerObj,
      },
    },
    action
  );
}

function parseCognitoAttributeObject(userCognito) {
  if (
    !userCognito ||
    !userCognito.UserAttributes ||
    userCognito.UserAttributes.length <= 0
  ) {
    return null;
  }

  const attributes = {};
  userCognito.UserAttributes.forEach((attr) => {
    attributes[attr.Name] = attr.Value;
  });
  return { ...attributes };
}

async function getUserInfo(email) {
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
    if (userDB.id) {
      userInfo.db = userDB;
    }
    if (getOrCheck(userCognito, "email")) {
      userInfo.cognito = parseCognitoAttributeObject(userCognito);
    }
    return userInfo;
  } catch (error) {
    return userInfo;
  }
}

function isUserExisted(userInfo) {
  return userInfo && userInfo.db && userInfo.cognito;
}

async function verifyEmailAndNewEmail({
  originalEmail,
  userInfoOriginal,
  newEmail,
  userInfoNewEmail,
  language,
}) {
  try {
    // If original email not existed - throw error record not found
    if (!isUserExisted(userInfoOriginal)) {
      await errorWrapper(
        UpdateUserErrors.ciamEmailNotExists(originalEmail, language)
      );
    }

    // If new email is existed - throw error account being user by other
    if (newEmail) {
      if (isUserExisted(userInfoNewEmail)) {
        await errorWrapper(
          UpdateUserErrors.ciamNewEmailBeingUsedErr(newEmail, language)
        );
      }
    }
  } catch (error) {
    throw new Error(error);
  }
}

async function updateUserInfoCognito(
  data,
  userCognito,
  email,
  newEmail,
  language
) {
  /*
    prepare replace user's name at Cognito
     handle replace username at cognito by firstName + lastName
   */
  let userName = userCognito.name || "";
  const userFirstName = userCognito.given_name || "";
  const userLastName = userCognito.family_name || "";
  const emailReplicate = newEmail ? newEmail : email;

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
      if (
        [
          "uuid",
          "newPassword",
          "confirmPassword",
          "oldPassword",
          "group",
        ].includes(key)
      ) {
        return;
      }
      if (key === "newsletter") {
        return {
          Name: COGNITO_ATTRIBUTES[key],
          Value: JSON.stringify(data.newsletter),
        };
      }
      if (key === "phoneNumber") {
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
      { Name: "name", Value: userName },
      {
        Name: "email",
        Value: emailReplicate,
      },
    ];
    if (
      data.phoneNumber === null ||
      data.phoneNumber === undefined ||
      data.phoneNumber.trim() === ""
    ) {
      // find the index of the phone_number parameter
      const phoneIndex = cognitoUpdateParams.findIndex(
        (cognitoUpdateParams) => cognitoUpdateParams.Name === "phone_number"
      );
      // remove the phone_number parameter if found
      if (phoneIndex !== -1) {
        cognitoUpdateParams.splice(phoneIndex, 1);
      }
    }
    loggerWrapper("[CIAM-MAIN] Process Update User At Cognito - Start", {
      userEmail: email,
      layer: "userUpdateMPHelper.processUpdateUserAtCognito",
      cognitoUpdateParams: JSON.stringify(cognitoUpdateParams),
    });
    await cognitoService.cognitoAdminUpdateNewUser(cognitoUpdateParams, email);
    loggerWrapper(
      "[CIAM-MAIN] Process Update User At Cognito - Start - Success",
      {
        userEmail: email,
        layer: "userUpdateMPHelper.processUpdateUserAtCognito",
      }
    );
  } catch (error) {
    loggerWrapper(
      "[CIAM-MAIN] Process Update User At Cognito - Start - Failed",
      {
        userEmail: email,
        layer: "userUpdateMPHelper.processUpdateUserAtCognito",
        error: new Error(error),
      },
      "error"
    );
    await errorWrapper(UpdateUserErrors.ciamUpdateUserErr(language));
  }
}

function manipulatePassword(
  ncRequest,
  passwordFromNC = undefined,
  passwordFromRequest = undefined
) {
  if (ncRequest && passwordFromNC) {
    return passwordFromNC;
  }
  return passwordFromRequest;
}

async function processUpdateUserAtCognito({
  email,
  newEmail,
  data,
  userInfo,
  ncRequest,
  language,
}) {
  const password = manipulatePassword(
    ncRequest,
    data.password,
    data.newPassword
  );

  try {
    //1st updatePassword with original email -> if failed the process update will stop
    if (password) {
      try {
        await cognitoService.cognitoAdminSetUserPassword(email, password);
        loggerWrapper(
          "[CIAM-MAIN] userUpdateMPHelper.processUpdateUserAtCognito Update Password Success",
          {
            userEmail: email,
            layer: "userUpdateMPHelper.processUpdateUserAtCognito",
          }
        );
      } catch (error) {
        loggerWrapper(
          "[CIAM-MAIN] userUpdateMPHelper.processUpdateUserAtCognito Update Password Success",
          {
            userEmail: email,
            layer: "userUpdateMPHelper.processUpdateUserAtCognito",
            error: new Error(error),
          },
          "error"
        );
        //throw error moving to top try catch block
        await errorWrapper(UpdateUserErrors.ciamUpdateUserErr(language));
      }
    }

    //2nd update other information for user
    await updateUserInfoCognito(data, userInfo, email, newEmail, language);
  } catch (error) {
    //throw error for service handle
    throw new Error(error);
  }
}

async function updateDB(data, userId, email, password, language = "en") {
  //enhance it should apply rollback when some executions got failed
  //or saving to failed_job
  try {
    loggerWrapper("[CIAM-MAIN] Update User table", {
      userEmail: email,
      layer: "userUpdateMPHelper.updateDB",
      data: JSON.stringify({
        given_name: data.firstName,
        family_name: data.lastName,
        birthdate: data.dob ? convertDateToMySQLFormat(data.dob) : undefined,
        email: email,
      }),
    });
    await userDBService.userModelExecuteUpdate(
      userId,
      data.firstName,
      data.lastName,
      data.dob,
      email
    );
    const hashPassword = password ? await passwordService.hashPassword(
        password.toString()
    ) : undefined;
    loggerWrapper("[CIAM-MAIN] Update User Credentials table", {
      userEmail: email,
      layer: "userUpdateMPHelper.updateDB",
      data: JSON.stringify({
        password_hash: hashPassword,
        username: email,
      }),
    });
    await userCredentialModel.updateByUserId(userId, {
      password_hash: hashPassword,
      username: email,
      salt: null,
    });
    if (data.newsletter && data.newsletter.name) {
      loggerWrapper("[CIAM-MAIN] Update User Newsletter table", {
        userEmail: email,
        layer: "userUpdateMPHelper.updateDB",
        data: JSON.stringify({
          userId: userId,
          newsletter: data.newsletter,
        }),
      });
      await userDBService.userNewsletterModelExecuteUpdate(
        userId,
        data.newsletter
      );
    }
    if (data.phoneNumber || data.address || data.country) {
      loggerWrapper("[CIAM-MAIN] Update User Details table", {
        userEmail: email,
        layer: "userUpdateMPHelper.updateDB",
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
        data.country
      );
    }
  } catch (error) {
    await errorWrapper(UpdateUserErrors.ciamUpdateUserErr(language));
  }
}

async function processUpdateUserAtDB({
  email,
  newEmail,
  data,
  userId,
  ncRequest,
  language,
}) {
  const latestEmail = newEmail ? newEmail : email;
  const password = manipulatePassword(
    ncRequest,
    data.password,
    data.newPassword
  );
  console.log('uyser iudidididid', userId)
  try {
    loggerWrapper("[CIAM-MAIN] Process update user at DB - Start", {
      userEmail: email,
      layer: "userUpdateMPHelper.processUpdateUserAtDB",
    });
    await updateDB(data, userId, latestEmail, password, language);
    loggerWrapper("[CIAM-MAIN] Process update user at DB - Success", {
      userEmail: email,
      layer: "userUpdateMPHelper.processUpdateUserAtDB",
    });
  } catch (error) {
    loggerWrapper("[CIAM-MAIN] Process update user at DB - Failed", {
      userEmail: email,
      layer: "userUpdateMPHelper.processUpdateUserAtDB",
      error: new Error(error),
    });
    //throw error for service handle
    throw new Error(error);
  }
}

module.exports = {
  verifyEmailAndNewEmail,
  getUserInfo,
  processUpdateUserAtCognito,
  processUpdateUserAtDB,
};
