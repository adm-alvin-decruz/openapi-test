const { existsCapitalizePattern } = require("../utils/common");
const cognitoService = require("../services/cognitoService");
const { parseCognitoAttributeObject } = require("./cognitoHelpers");
const loggerService = require("../logs/logger");

class EmailSensitiveHelper {
  constructor() {
    this.email = null;
  }

  static async findEmailInCognito(email) {
    //1. check email with exists capitalize
    if (existsCapitalizePattern(email)) {
      loggerService.log(
        {
          user: {
            email: email,
            action: "findEmailInCognito",
            layer: "helpers.emailSensitiveHelper",
          },
        },
        "[CIAM-MAIN] Start Handler Email Sensitive - Start"
      );
      //1. Pretend this queries an email case-insensitive
      const user = await this.processCaseSensitiveInputEmail(email);

      loggerService.log(
        {
          user: {
            user: JSON.stringify(user),
            action: "findEmailInCognito",
            layer: "helpers.emailSensitiveHelper",
          },
        },
        "[CIAM-MAIN] Start Handler Email Sensitive - Success"
      );
      if (user) {
        return (this.email = user.email.trim().toLowerCase());
      }
    }

    return (this.email = email.trim().toLowerCase());
  }

  static async processCaseSensitiveInputEmail(email) {
    const userCognito = await this.queryCognitoCaseSensitiveEmailWithRetry(
      email
    );

    //try to update cognito email if applicable
    if (
      userCognito &&
      userCognito.email &&
      existsCapitalizePattern(userCognito.email)
    ) {
      loggerService.log(
        {
          user: {
            cognitoEmail: userCognito.email,
            action: "processCaseSensitiveInputEmail",
            layer: "helpers.emailSensitiveHelper",
          },
        },
        "[CIAM-MAIN] Start Process Update Email Sensitive - Start"
      );
      await cognitoService.cognitoAdminUpdateNewUser(
        [
          { Name: "email", Value: email.trim().toLowerCase() },
          { Name: "preferred_username", Value: email.trim().toLowerCase() },
        ],
        userCognito.email
      );
      loggerService.log(
        {
          user: {
            cognito: JSON.stringify(userCognito),
            action: "processCaseSensitiveInputEmail",
            layer: "helpers.emailSensitiveHelper",
          },
        },
        "[CIAM-MAIN] Start Process Update Email Sensitive - Success"
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
        loggerService.log(
          {
            user: {
              email: emailRequest,
              retryTimes: attempts,
              action: "queryCognitoCaseSensitiveEmailWithRetry",
              layer: "helpers.emailSensitiveHelper",
            },
          },
          "[CIAM-MAIN] Start Query Cognito Email Sensitive With Retry - Start"
        );
        //1. using AdminGetUserCommand with email user input
        response = await cognitoService.cognitoAdminGetUserByEmail(
          emailRequest
        );
        success = true;
        loggerService.log(
          {
            user: {
              email: emailRequest,
              retryTimes: attempts,
              action: "queryCognitoCaseSensitiveEmailWithRetry",
              layer: "helpers.emailSensitiveHelper",
            },
          },
          "[CIAM-MAIN] Start Query Cognito Email Sensitive With Retry - Success"
        );
        return parseCognitoAttributeObject(response);
      } catch (err) {
        attempts++;
        emailRequest = email.trim().toLowerCase();
        if (attempts > maxAttempts) {
          return null;
        }
      }
    } while (!success);
  }
}

module.exports = EmailSensitiveHelper;
