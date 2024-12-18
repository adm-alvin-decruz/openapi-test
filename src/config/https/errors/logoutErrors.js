/*TODO update multiple language later*/
class LogoutErrors {
  static ciamLogoutUserNotFound(email) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_NULL",
        message: "No record found.",
      },
      status: "success",
      statusCode: 200,
    };
  }
}

module.exports = LogoutErrors;
