const { messageLang } = require("../../../utils/common");

class CommonErrors {
  static NotImplemented() {
    return {
      membership: {
        code: 501,
        mwgCode: "MWG_CIAM_NOT_IMPLEMENTED",
        message: "Not implemented",
      },
      status: "failed",
      statusCode: 501,
    };
  }
  static InternalServerError() {
    return {
      membership: {
        code: 500,
        mwgCode: "MWG_CIAM_INTERNAL_SERVER_ERROR",
        message: "Internal Server Error",
      },
      status: "failed",
      statusCode: 500,
    };
  }
  static BadRequest(key, message, lang) {
    return {
      membership: {
        code: 400,
        mwgCode: "MWG_CIAM_PARAMS_ERR",
        message: "Wrong parameters",
        error: {
          [`${key}`]: messageLang(message, lang),
        },
      },
      status: "failed",
      statusCode: 400,
    };
  }
  static PasswordErr(lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_PASSWORD_ERR_01",
        message: messageLang("password_invalid", lang),
      },
      status: "success",
      statusCode: 200,
    };
  }
  static PasswordNotMatch(lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_PASSWORD_ERR_02",
        message: messageLang("confirmPassword_invalid", lang),
      },
      status: "success",
      statusCode: 200,
    };
  }
  static PasswordRequireErr(lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_PASSWORD_ERR_03",
        message: messageLang("old_password_invalid", lang),
      },
      status: "success",
      statusCode: 200,
    };
  }
  static UnauthorizedException(lang) {
    return {
      membership: {
        code: 401,
        mwgCode: "MWG_CIAM_UNAUTHORIZED",
        message: messageLang("unauthorized", lang),
      },
      status: "failed",
      statusCode: 401,
    };
  }
  static PasswordExpireOrBeingUsed(lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_PASSWORD_ERR_04",
        message: messageLang("token_reset_password_being_used", lang),
      },
      status: "success",
      statusCode: 200,
    };
  }
}

module.exports = CommonErrors;
