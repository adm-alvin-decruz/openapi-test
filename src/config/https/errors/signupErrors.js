const { messageLang } = require('../../../utils/common');

class SignupErrors {
  static ciamSignUpErr(lang) {
    return {
      membership: {
        code: 400,
        mwgCode: 'MWG_CIAM_USER_SIGNUP_ERR',
        message: messageLang('signup_error', lang),
      },
      status: 'failed',
      statusCode: 400,
    };
  }
  static ciamEmailExists(lang) {
    return {
      membership: {
        code: 400,
        mwgCode: 'MWG_CIAM_USER_SIGNUP_ACCOUNT_EXIST_ERR',
        message: messageLang('signup_email', lang),
      },
      status: 'failed',
      statusCode: 400,
    };
  }
  static ciamMandaiIdExists(lang) {
    return {
      membership: {
        code: 400,
        mwgCode: 'MWG_CIAM_USER_SIGNUP_MANDAIID_EXIST_ERR',
        message: messageLang('signup_mid', lang),
      },
      status: 'failed',
      statusCode: 400,
    };
  }
}

module.exports = SignupErrors;
