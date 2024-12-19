const { messageLang } = require("../../../utils/common");

class LogoutErrors {
  static ciamLogoutUserNotFound(lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_NULL",
        message: messageLang("email_no_record", lang),
      },
      status: "success",
      statusCode: 200,
    };
  }
}

module.exports = LogoutErrors;
