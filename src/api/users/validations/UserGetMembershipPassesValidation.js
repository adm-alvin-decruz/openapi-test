const CommonErrors = require("../../../config/https/errors/common");

class UserGetMembershipPassesValidation {
  constructor() {
    this.error = null;
  }

  static execute(data) {
    if (!data.email && !data.mandaiId) {
      return (this.error = CommonErrors.BadRequest(
          "email",
          "membership_email_invalid",
          data.language
      ));
    }

    if (!data || !data.visualId) {
      return (this.error = CommonErrors.BadRequest(
          "visualId",
          "visualId_invalid",
          data.language
      ));
    }
    if (!!data.visualId && data.visualId.trim() === "") {
      return (this.error = CommonErrors.BadRequest(
        "visualId",
        "visualId_invalid",
        data.language
      ));
    }

    return (this.error = null);
  }
}

module.exports = UserGetMembershipPassesValidation;
