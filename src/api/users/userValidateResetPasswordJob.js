const UserValidateResetPasswordService = require('./userValidateResetPasswordService');
const { messageLang } = require('../../utils/common');

class UserValidateResetPasswordJob {
  success(token, lang) {
    return {
      membership: {
        code: 200,
        mwgCode: 'MWG_CIAM_VALIDATE_PASSWORD_TOKEN_SUCCESS',
        message: messageLang('token_valid', lang),
        isValid: true,
        passwordToken: token,
      },
      status: 'success',
      statusCode: 200,
    };
  }

  async perform(token, lang) {
    try {
      const rs = await UserValidateResetPasswordService.execute(token, lang);
      return this.success(rs.token, lang);
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      throw new Error(JSON.stringify(errorMessage));
    }
  }
}

module.exports = new UserValidateResetPasswordJob();
