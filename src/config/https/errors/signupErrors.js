const { messageLang } = require("../../../utils/common");

class SignupErrors {
  static ciamSignUpErr(lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_USER_SIGNUP_ERR",
        message: messageLang('signup_error', lang),
      },
      status: "success",
      statusCode: 200,
    };
  }
  static ciamEmailExists(lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_USER_SIGNUP_ERR",
        message: messageLang('signup_email', lang),
      },
      status: "success",
      statusCode: 200,
    };
  }
}

module.exports = SignupErrors;
