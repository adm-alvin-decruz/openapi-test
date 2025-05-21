const CommonErrors = require("../../../config/https/errors/commonErrors");

class UserVerifyTokenValidation {
  constructor() {
    this.error = null;
  }

  static validateRequest(body, lang) {
    const keys = Object.keys(body);
    const filterKeys = keys.filter(key => key !== "language");
    if (filterKeys[0] === "email" && !body.email.trim().length) {
      return (this.error = CommonErrors.BadRequest(
        "email",
        "email_is_invalid",
        lang
      ));
    }
    if (filterKeys[0] === "mandaiId" && !body.mandaiId.trim().length) {
      return (this.error = CommonErrors.BadRequest(
        "mandaiId",
        "membership_pass_mandaiId",
        lang
      ));
    }
    return (this.error = null);
  }

  static execute(body) {
    return this.validateRequest(body, body.language);
  }
}

module.exports = UserVerifyTokenValidation;
