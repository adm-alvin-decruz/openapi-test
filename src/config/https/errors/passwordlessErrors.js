const { messageLang } = require('../../../utils/common');
const validator = require('validator');

class PasswordlessErrors {
  static sendCodeError(email, lang) {
    return {
      auth: {
        code: 500,
        mwgCode: 'MWG_CIAM_SEND_OTP_ERR',
        message: messageLang('sendCode_failed', lang),
        email: validator.escape(email),
      },
      status: 'failed',
      statusCode: 500,
    };
  }

  static membershipLoginDisallowed(email, lang = 'en') {
    return {
      auth: {
        code: 403,
        mwgCode: 'MWG_CIAM_MEMBERSHIP_LOGIN_DISALLOWED',
        message: messageLang('passwordless_login_disallowed', lang),
        email: validator.escape(email),
      },
      status: 'failed',
      statusCode: 403,
    };
  }

  static wildpassLoginDisallowed(email, lang = 'en') {
    return {
      auth: {
        code: 403,
        mwgCode: 'MWG_CIAM_WILDPASS_LOGIN_DISALLOWED',
        message: messageLang('passwordless_login_disallowed', lang),
        email: validator.escape(email),
      },
      status: 'failed',
      statusCode: 403,
    };
  }

  static loginDisabled(email, secondsRemaining, lang = 'en') {
    return {
      auth: {
        code: 429,
        mwgCode: 'MWG_CIAM_USERS_LOGIN_DISABLED',
        message: messageLang('passwordless_login_disabled', lang),
        email: validator.escape(email),
        remainingSeconds: secondsRemaining,
      },
      status: 'failed',
      statusCode: 429,
    };
  }

  static newUserError(email, lang) {
    return {
      auth: {
        code: 404,
        mwgCode: 'MWG_CIAM_USERS_SIGNUP_NOT_SUPPORTED',
        message: messageLang('sendCode_newUser', lang),
        email: validator.escape(email),
      },
      status: 'failed',
      statusCode: 404,
    };
  }

  static sendCodetooSoonFailure(email, lang, remainingSeconds) {
    return {
      auth: {
        code: 429,
        mwgCode: 'MWG_CIAM_USERS_CODE_RATE_LIMIT',
        message: messageLang('sendCode_tooSoon', lang),
        email: validator.escape(email),
        remainingSeconds,
      },
      status: 'failed',
      statusCode: 429,
    };
  }

  static verifyOtpError(email, lang) {
    return {
      auth: {
        code: 401,
        mwgCode: 'MWG_CIAM_USERS_OTP_ERR',
        message: messageLang('verifyOTP_invalid', lang),
        email: validator.escape(email),
      },
      status: 'failed',
      statusCode: 401,
    };
  }

  static verifyMagicLinkError(lang) {
    return {
      auth: {
        code: 401,
        mwgCode: 'MWG_CIAM_USERS_MAGIC_LINK_ERR',
        message: messageLang('verifyML_invalid', lang),
      },
      status: 'failed',
      statusCode: 401,
    };
  }

  static expiredError(email, lang) {
    return {
      auth: {
        code: 401,
        mwgCode: 'MWG_CIAM_USERS_OTP_EXPIRED',
        message: messageLang('verifyOTP_expired', lang),
        email: validator.escape(email),
      },
      status: 'failed',
      statusCode: 401,
    };
  }

  static tokenMissingError(lang) {
    return {
      auth: {
        code: 400,
        mwgCode: 'MWG_CIAM_PARAMS_ERR',
        message: messageLang('verifyML_missingToken', lang),
      },
      status: 'failed',
      statusCode: 400,
    };
  }
}

module.exports = PasswordlessErrors;
