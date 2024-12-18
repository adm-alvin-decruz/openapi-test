const UserLogoutService = require("./userLogoutServices");

class UserLogoutJob {
  success(email) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_USERS_LOGOUT_SUCCESS",
        message: "Logout success.",
        email: email,
      },
      status: "success",
      statusCode: 200,
    };
  }

  async perform(token) {
    try {
      const rs = await UserLogoutService.execute(token);
      return this.success(rs.email);
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      throw new Error(JSON.stringify(errorMessage))
    }
  }
}

module.exports = new UserLogoutJob();
