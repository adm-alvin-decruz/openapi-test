/*TODO update multiple language later*/
const { messageLang } = require("../../../utils/common");

class LoginErrors {
  static ciamLoginUserNotFound(email, lang) {
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
  static ciamLoginEmailInvalid(email, lang) {
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
}

module.exports = LoginErrors;
