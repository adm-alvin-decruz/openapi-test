const { messageLang } = require("../../../utils/common");

class UpdateUserErrors {
  static ciamSignUpErr(lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_USER_SIGNUP_ERR",
        message: messageLang('update_user_error', lang),
      },
      status: "success",
      statusCode: 200,
    };
  }
  static ciamEmailNotExists(lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_USER_UPDATE_ERR",
        message: messageLang('email_not_being_used', lang),
      },
      status: "success",
      statusCode: 200,
    };
  }
}

module.exports = UpdateUserErrors;
