/*TODO update multiple language later*/
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
}

module.exports = MembershipErrors;
