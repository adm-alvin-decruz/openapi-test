const UserLogoutService = require("./userLogoutServices");
const {messageLang} = require("../../utils/common");

class UserLogoutJob {
  success(email, lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_USERS_LOGOUT_SUCCESS",
        message: messageLang("logout_success", lang),
        email: email,
      },
      status: "success",
      statusCode: 200,
    };
  }

  async perform(token, lang) {
    try {
      const rs = await UserLogoutService.execute(token, lang);
      return this.success(rs.email, lang);
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      throw new Error(JSON.stringify(errorMessage))
    }
  }
}

module.exports = new UserLogoutJob();
