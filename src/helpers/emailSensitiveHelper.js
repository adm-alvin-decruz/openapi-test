const { existsCapitalizePattern } = require("../utils/common");
const cognitoService = require("../services/cognitoService");
const { parseCognitoAttributeObject } = require("./cognitoHelpers");
const loggerService = require("../logs/logger");
const userModel = require("../db/models/userModel");

class EmailSensitiveHelper {
  constructor() {
    this.email = null;
  }

  static async findEmailInCognito(email, newEmailFlag = false) {
    //1. check email with exists capitalize
    if (existsCapitalizePattern(email)) {
      this.loggerWrapper("[CIAM-MAIN] Start Handler Email Sensitive - Start", {
        email: email,
        layer: "EmailSensitiveHelper.findEmailInCognito",
        newEmailFlag
      });
      //1. Pretend this queries an email case-insensitive
      const user = await this.processCaseSensitiveInputEmail(email, newEmailFlag);
      this.loggerWrapper("[CIAM-MAIN] Start Handler Email Sensitive - Start", {
        user: JSON.stringify(user),
        layer: "EmailSensitiveHelper.findEmailInCognito",
        newEmailFlag
      });
      if (user) {
        return (this.email = user.email.trim().toLowerCase());
      }
    }

    return (this.email = email.trim().toLowerCase());
  }

  static async processCaseSensitiveInputEmail(email, newEmailFlag) {
    //If newEmail existed payload - always checking from DB
    let userDB = null;
    if (newEmailFlag) {
      userDB = await userModel.findByEmail(email)
    }

    const userCognito = await this.queryCognitoCaseSensitiveEmailWithRetry(
      email
    );

    //try to update cognito email if email exists capitalize and userDB have not found
    if (userCognito && userCognito.email && existsCapitalizePattern(userCognito.email) && !userDB) {
      this.loggerWrapper(
        "[CIAM-MAIN] Start Process Update Email Sensitive - Start",
        {
          cognitoEmail: userCognito.email,
          layer: "EmailSensitiveHelper.processCaseSensitiveInputEmail",
        }
      );
      await cognitoService.cognitoAdminUpdateNewUser(
        [
          { Name: "email", Value: email.trim().toLowerCase() },
          { Name: "preferred_username", Value: email.trim().toLowerCase() },
        ],
        userCognito.email
      );

      //update credentials information
      this.loggerWrapper(
        "[CIAM-MAIN] Start Process Update Email Sensitive - Success",
        {
          cognitoUserInfo: JSON.stringify(userCognito),
          layer: "EmailSensitiveHelper.processCaseSensitiveInputEmail",
        }
      );
    }
    return userCognito;
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
