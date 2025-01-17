const { messageLang } = require("../../../utils/common");

class UpdateUserErrors {
  static ciamUpdateUserErr(lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_USER_UPDATE_ERR",
        message: messageLang("update_user_error", lang),
      },
      status: "success",
      statusCode: 200,
    };
  }
  static ciamEmailNotExists(email, lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_USER_UPDATE_ERR",
        message: messageLang("email_not_being_used", lang),
        email: email
      },
      status: "success",
      statusCode: 200,
    };
  }
  static ciamNewEmailBeingUsedErr(email, lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_USER_UPDATE_ERR",
        message: messageLang("newEmail_being_used", lang),
        email: email
      },
      status: "success",
      statusCode: 200,
    };
  }
}

module.exports = UpdateUserErrors;
