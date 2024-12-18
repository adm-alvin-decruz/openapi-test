const UserLoginService = require("./userLoginServices");

class UserLoginJob {
  success(result) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_USERS_LOGIN_SUCCESS",
        message: "Login success.",
        accessToken: result.accessToken,
        mandaiId: result.mandaiId,
        email: result.email,
      },
      status: "success",
      statusCode: 200,
    };
  }

  async perform(req) {
    //execute login process
    try {
      const rs = await UserLoginService.execute(req);
      return this.success(rs);
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      throw new Error(JSON.stringify(errorMessage));
    }
  }
}

module.exports = new UserLoginJob();
