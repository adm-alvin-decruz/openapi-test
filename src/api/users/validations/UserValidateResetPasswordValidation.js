const CommonErrors = require("../../../config/https/errors/commonErrors");
const ValidateTokenErrors = require("../../../config/https/errors/validateTokenErrors");

class UserValidateResetPasswordValidation {
  constructor() {
    this.error = null;
  }

  static validateRequest(token, lang) {
    if (!token) {
      return (this.error = CommonErrors.BadRequest(
        "passwordToken",
        "passwordToken_required",
        lang
      ));
    }
    if (token && token.length !== 32) {
      return (this.error = ValidateTokenErrors.ciamValidateTokenErr(lang));
    }
    return (this.error = null);
  }

  static execute(data, lang) {
    return this.validateRequest(data, lang);
  }
}

module.exports = UserValidateResetPasswordValidation;
