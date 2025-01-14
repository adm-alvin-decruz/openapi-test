const UserLoginService = require("./userLoginServices");
const { messageLang } = require("../../utils/common");

class UserLoginJob {
  success(result, lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_USERS_LOGIN_SUCCESS",
        message: messageLang("login_success", lang),
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
      return this.success(rs, req.body.language);
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      throw new Error(JSON.stringify(errorMessage));
    }
  }
}

module.exports = new UserLoginJob();
