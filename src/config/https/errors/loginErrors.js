/*TODO update multiple language later*/
class LoginErrors {
  static ciamLoginUserNotFound(email) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_NULL",
        message: "No record found.",
        email: email
      },
      status: "success",
      statusCode: 200,
    };
  }
  static ciamLoginEmailInvalid(email) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_EMAIL_ERR",
        message: "Requested email is invalid or empty.",
        email: email
      },
      status: "success",
      statusCode: 200,
    };
  }
}

module.exports = LoginErrors;
