const UserSignupService = require("./userSignupService");
const { messageLang } = require("../../utils/common");

class UserSignupJob {
  async execute(req) {
    return await UserSignupService.signup(req);
  }

  async perform(req) {
    try {
      const rs = await this.execute(req);
      return {
        membership: {
          code: 200,
          mwgCode: "MWG_CIAM_USER_SIGNUP_SUCCESS",
          message: messageLang("signup_success", req.language),
          mandaiId: rs.mandaiId,
        },
        status: "success",
        statusCode: 200,
      };
    } catch (error) {
      const errorMessage = JSON.parse(error.message)
      throw new Error(JSON.stringify(errorMessage))
    }
  }
}

module.exports = new UserSignupJob();
