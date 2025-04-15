const { existsCapitalizePattern } = require("../utils/common");
const cognitoService = require("../services/cognitoService");
const { parseCognitoAttributeObject } = require("./cognitoHelpers");
const loggerService = require("../logs/logger");
const userCredentialModel = require("../db/models/userCredentialModel");
const userModel = require("../db/models/userModel");

class EmailSensitiveHelper {
  constructor() {
    this.email = null;
  }

  static async findEmailInCognito(email) {
    //1. check email with exists capitalize
    this.loggerWrapper("[CIAM-MAIN] Start Handler Email Sensitive - Start", {
      email: email,
      layer: "EmailSensitiveHelper.findEmailInCognito",
    });
    //1. Pretend this queries an email case-insensitive
    const user = await this.processCaseSensitiveInputEmail(
      email,
    );
    this.loggerWrapper("[CIAM-MAIN] Start Handler Email Sensitive - Success", {
      user: JSON.stringify(user),
      layer: "EmailSensitiveHelper.findEmailInCognito",
    });
    return (this.email = user && user.email ? user.email.trim().toLowerCase() : email.trim().toLowerCase());
  }

  static async processCaseSensitiveInputEmail(email) {
    //get user from DB if possible
    const userCredentialsInfo = await userCredentialModel.findByUserEmailOrMandaiId(email, '');
    const normalizedEmail = email.trim().toLowerCase();

    //If user from DB active = 1 & subId is available -> return email lowercase directly
    if (userCredentialsInfo && userCredentialsInfo.user_sub_id) {
      return {
        email: email.trim().toLowerCase()
      }
    }

    //If user has not found at DB - return email lowercase directly - cover for case newEmail
    if (!userCredentialsInfo || !userCredentialsInfo.email) {
      return {
        email: email.trim().toLowerCase()
      }
    }

    const userCognito = await this.queryCognitoCaseSensitiveEmailWithRetry(userCredentialsInfo.email);
    const userSubId = userCognito && userCognito.sub ? userCognito.sub : null;

    //cover for cases cognito not response userSubID for first time access system
    if (userSubId) {
      await userCredentialModel.updateByUserIdAndEmail(userCredentialsInfo.email, userCredentialsInfo.user_id, {
        user_sub_id: userSubId,
        username: normalizedEmail
      });
      await userModel.updateByUserIdAndEmail(userCredentialsInfo.email, userCredentialsInfo.user_id, {
        email: normalizedEmail
      });
    }

    //try to update cognito/db for email should lowercase if email exists capitalize
    if (userCredentialsInfo && userCredentialsInfo.email && existsCapitalizePattern(userCredentialsInfo.email)) {
      try {
        this.loggerWrapper(
          "[CIAM-MAIN] Start Process Update Email Sensitive - Start",
          {
            email: userCredentialsInfo.email,
            layer: "EmailSensitiveHelper.processCaseSensitiveInputEmail",
          }
        );
        await cognitoService.cognitoAdminUpdateNewUser(
          [
            { Name: "email", Value: normalizedEmail },
            { Name: "preferred_username", Value: normalizedEmail },
          ],
            userCredentialsInfo.email
        );
        this.loggerWrapper(
          "[CIAM-MAIN] Start Process Update Email Sensitive - Success",
          {
            cognitoUser: JSON.stringify(userCognito),
            userSubId,
            email: normalizedEmail,
            layer: "EmailSensitiveHelper.processCaseSensitiveInputEmail",
          }
        );
        return userCognito;
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  static async queryCognitoCaseSensitiveEmailWithRetry(email, retryTimes = 1) {
    let attempts = 0;
    const maxAttempts = retryTimes;
    let success = false;
    let response;
    let emailRequest = email;

    do {
      try {
        this.loggerWrapper(
          "[CIAM-MAIN] Start Query Cognito Email Sensitive With Retry - Start",
          {
            email: emailRequest,
            retryTimes: attempts,
            layer:
              "EmailSensitiveHelper.queryCognitoCaseSensitiveEmailWithRetry",
          }
        );
        //1. using AdminGetUserCommand with email user input
        response = await cognitoService.cognitoAdminGetUserByEmail(
          emailRequest
        );
        success = true;
        this.loggerWrapper(
          "[CIAM-MAIN] Start Query Cognito Email Sensitive With Retry - Success",
          {
            email: emailRequest,
            retryTimes: attempts,
            layer:
              "EmailSensitiveHelper.queryCognitoCaseSensitiveEmailWithRetry",
          }
        );
        return parseCognitoAttributeObject(response);
      } catch (err) {
        this.loggerWrapper(
          "[CIAM-MAIN] Start Query Cognito Email Sensitive With Retry - Failed",
          {
            email: emailRequest,
            retryTimes: attempts,
            layer:
              "EmailSensitiveHelper.queryCognitoCaseSensitiveEmailWithRetry",
          },
          "error"
        );
        attempts++;
        emailRequest = email.trim().toLowerCase();
        if (attempts > maxAttempts) {
          return null;
        }
      }
    } while (!success);
  }

  static loggerWrapper(action, loggerObj, type = "logInfo") {
    if (type === "error") {
      return loggerService.error(
        { emailSensitiveHelper: { ...loggerObj } },
        {},
        action
      );
    }

    return loggerService.log(
      { emailSensitiveHelper: { ...loggerObj } },
      action
    );
  }
}

module.exports = EmailSensitiveHelper;
