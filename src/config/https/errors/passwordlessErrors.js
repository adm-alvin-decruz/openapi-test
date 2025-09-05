const { messageLang } = require("../../../utils/common");
const validator = require("validator");

class PasswordlessErrors {
  static sendCodeError(email, lang) {
    return {
      auth: {
        code: 200,
        mwgCode: "MWG_CIAM_SEND_OTP_ERR",
        message: messageLang("sendCode_failed", lang),
        email: validator.escape(email),
      },
      status: "failed",
      statusCode: 200,
    };
  }

  static sendCodetooSoonFailure(email, lang) {
    return {
      auth: {
        code: 429,
        mwgCode: "MWG_CIAM_USERS_CODE_RATE_LIMIT",
        message: messageLang("sendCode_tooSoon", lang),
        email: validator.escape(email),
      },
      status: "failed",
      statusCode: 429,
    };
  }

  static verifyOtpError(email, lang) {
    return {
      auth: {
        code: 401,
        mwgCode: "MWG_CIAM_USERS_OTP_ERR",
        message: messageLang("verifyOTP_invalid", lang),
        email: validator.escape(email),
      },
      status: "failed",
      statusCode: 401,
    };
  }

  static verifyMagicLinkError(lang) {
    return {
      auth: {
        code: 401,
        mwgCode: "MWG_CIAM_USERS_MAGIC_LINK_ERR",
        message: messageLang("verifyML_invalid", lang),
      },
      status: "failed",
      statusCode: 401,
    };
  }

  static verifyRateLimitError(email, lang) {
    return {
      auth: {
        code: 429,
        mwgCode: "MWG_CIAM_USERS_OTP_ATTEMPT_EXCEEDED",
        message: messageLang("verifyOTP_tooManyAttempts", lang),
        email: validator.escape(email),
      },
      status: "failed",
      statusCode: 429,
    };
  }

  static expiredError(email, lang) {
    return {
      auth: {
        code: 401,
        mwgCode: "MWG_CIAM_USERS_OTP_EXPIRED",
        message: messageLang("verifyOTP_expired", lang),
        email: validator.escape(email),
      },
      status: "failed",
      statusCode: 401,
    };
  }

  static tokenMissingError(lang) {
    return {
      auth: {
        code: 400,
        mwgCode: "MWG_CIAM_PARAMS_ERR",
        message: messageLang("verifyML_missingToken", lang),
      },
      status: "failed",
      statusCode: 400,
    };
  }
}

module.exports = PasswordlessErrors;
