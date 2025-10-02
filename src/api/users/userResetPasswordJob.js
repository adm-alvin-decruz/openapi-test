const UserResetPasswordService = require('./userResetPasswordService');
const { messageLang } = require('../../utils/common');

class UserResetPasswordJob {
  success(email, lang) {
    return {
      membership: {
        code: 200,
        mwgCode: 'MWG_CIAM_USERS_EMAIL_RESET_PASSWORD_SUCCESS',
        message: messageLang('request_reset_password_success', lang),
        email: email,
      },
      status: 'success',
      statusCode: 200,
    };
  }

  async perform(req) {
    try {
      const rs = await UserResetPasswordService.execute(req);
      return this.success(rs.email, req.body.language);
    } catch (error) {
      const errorMessage = error && error.message ? JSON.parse(error.message) : error;
      throw new Error(JSON.stringify(errorMessage));
    }
  }
}

module.exports = new UserResetPasswordJob();
