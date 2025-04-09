const { existsCapitalizePattern } = require("../utils/common");
const cognitoService = require("../services/cognitoService");
const { parseCognitoAttributeObject } = require("./cognitoHelpers");

class EmailSensitiveHelper {
  constructor() {
    this.email = null;
  }

  static async findEmailInCognito(email) {
    //1. check email with exists capitalize
    if (existsCapitalizePattern(email)) {
      //1. Pretend this queries an email case-insensitive
      const user = await this.processCaseSensitiveInputEmail(email);

      if (user) {
        return (this.email = user.email.trim().toLowerCase());
      }
    }

    return (this.email = email.trim().toLowerCase());
  }

  static async processCaseSensitiveInputEmail(email) {
    const userCognito = await this.queryCognitoCaseSensitiveEmailWithRetry(email);

    //try to update cognito email if applicable
    if (
      userCognito &&
      userCognito.email &&
      existsCapitalizePattern(userCognito.email)
    ) {
      await cognitoService.cognitoAdminUpdateNewUser(
        [
          { Name: "email", Value: email.trim().toLowerCase() },
          { Name: "preferred_username", Value: email.trim().toLowerCase() },
        ],
        userCognito.email
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
        //1. using AdminGetUserCommand with email user input
        response = await cognitoService.cognitoAdminGetUserByEmail(
          emailRequest
        );
        success = true;
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
