const UserSignupService = require("./userSignupService");
const { messageLang } = require("../../utils/common");
const SignUpErrors = require("../../config/https/errors/signupErrors");

class UserSignupJob {
  failed(message, req) {
    if (message.statusCode) {
      return message;
    }
    return SignUpErrors.ciamSignUpErr(req.language);
  }

  success(rs, lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_USER_SIGNUP_SUCCESS",
        message: messageLang("signup_success", lang),
        mandaiId: rs.mandaiId,
      },
      status: "success",
      statusCode: 200,
    };
  }

  async execute(req) {
    return UserSignupService.signup(req);
  }

  async perform(req) {
    try {
      const rs = await this.execute(req);
      return this.success(rs, req.language);
    } catch (error) {
      return this.failed(error, req.language);
    }
  }
}

module.exports = new UserSignupJob();
