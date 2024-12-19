const { messageLang } = require("../../../utils/common");

class SignupErrors {
  static ciamWrongParams(key, lang) {
    return {
      membership: {
        code: 400,
        mwgCode: "MWG_CIAM_PARAMS_ERR",
        message: "Wrong parameters",
        error: {
          [`${key}`]: messageLang(`signup_${key}`, lang),
        },
      },
      status: "failed",
      statusCode: 400,
    };
  }
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
  static ciamPasswordErr(lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_PASSWORD_ERR_01",
        message: messageLang('signup_password', lang),
      },
      status: "success",
      statusCode: 200,
    };
  }
  static ciamPasswordNotMatch(lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_PASSWORD_ERR_02",
        message: messageLang('signup_confirmPassword', lang),
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
