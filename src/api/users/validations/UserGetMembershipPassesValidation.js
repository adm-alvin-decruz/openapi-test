const CommonErrors = require("../../../config/https/errors/common");

class UserGetMembershipPassesValidation {
  constructor() {
    this.error = null;
  }

  static execute(data) {
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
    /*
    Hide retrieve passes by list
     */
    // if (data.list && (!Array.isArray(data.list) || data.list.length === 0)) {
    //   return (this.error = CommonErrors.BadRequest(
    //     "list_visualId",
    //     "list_visualId_invalid",
    //     data.language
    //   ));
    // }
    //
    // if (data.list && Array.isArray(data.list) && data.visualId) {
    //   return (this.error = CommonErrors.BadRequest(
    //     "visualId",
    //     "visualId_invalid",
    //     data.language
    //   ));
    // }
    //
    // if (!data.visualId && !data.list) {
    //   return (this.error = CommonErrors.BadRequest(
    //     "visualId",
    //     "visualId_invalid",
    //     data.language
    //   ));
    // }

    return (this.error = null);
  }
}

module.exports = UserGetMembershipPassesValidation;
