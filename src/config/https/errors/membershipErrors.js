const { messageLang } = require('../../../utils/common');
const escape = require('escape-html');

class MembershipErrors {
  static ciamMembershipUserNotFound(email, lang) {
    return {
      membership: {
        code: 400,
        mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_NULL',
        message: messageLang('email_no_record', lang),
        email: escape(email),
      },
      status: 'failed',
      statusCode: 400,
    };
  }
  static ciamMembershipEmailInvalid(email, lang) {
    return {
      membership: {
        code: 400,
        mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_EMAIL_ERR',
        message: messageLang('membership_email_invalid', lang),
        email: escape(email),
      },
      status: 'failed',
      statusCode: 400,
    };
  }
  static ciamMembershipGetPassesInvalid(lang) {
    return {
      membership: {
        code: 400,
        mwgCode: 'MWG_CIAM_USERS_MY_MEMBERSHIPS_ERR',
        message: messageLang('get_membership_failed', lang),
      },
      status: 'failed',
      statusCode: 400,
    };
  }
  static ciamMembershipRequestAccountInvalid(email, lang) {
    return {
      membership: {
        code: 400,
        mwgCode: 'MWG_CIAM_WILDPASS_RESET_PASSWORD_ERR',
        message: messageLang('wildpass_account_request_invalid', lang),
        email: escape(email),
      },
      status: 'failed',
      statusCode: 400,
    };
  }
  /**
   * For reset password when account not found
   *
   * @param {string} email
   * @param {string} lang
   * @returns
   */
  static ciamMembershipRequestNoMPAccount(email, lang) {
    return {
      membership: {
        code: 400,
        mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_NULL_ERR',
        message: messageLang('wildpass_not_having_membership_account_error', lang),
        email: escape(email),
      },
      status: 'failed',
      statusCode: 400,
    };
  }
}

module.exports = MembershipErrors;
