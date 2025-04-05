const { messageLang } = require("../../../utils/common");

class MembershipErrors {
  static ciamMembershipUserNotFound(email, lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_NULL",
        message: messageLang("email_no_record", lang),
        email: email,
      },
      status: "success",
      statusCode: 200,
    };
  }
  static ciamMembershipEmailInvalid(email, lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_EMAIL_ERR",
        message: messageLang("membership_email_invalid", lang),
        email: email,
      },
      status: "success",
      statusCode: 200,
    };
  }
  static ciamMembershipGetPassesInvalid(lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_USERS_MY_MEMBERSHIPS_ERR",
        message: messageLang("get_membership_failed", lang),
      },
      status: "success",
      statusCode: 200,
    };
  }
  static ciamMembershipRequestAccountInvalid(email, lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_WILDPASS_RESET_PASSWORD_ERR",
        message: messageLang("wildpass_account_request_invalid", lang),
        email: email,
      },
      status: "failed",
      statusCode: 200,
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
        code: 200,
        mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_NULL_ERR",
        message: messageLang("wildpass_not_having_membership_account_error", lang),
        email: email,
      },
      status: "failed",
      statusCode: 200,
    };
  }

}

module.exports = MembershipErrors;
