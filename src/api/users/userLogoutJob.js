const UserLogoutService = require('./userLogoutServices');
const { messageLang } = require('../../utils/common');

class UserLogoutJob {
  success(body) {
    return {
      membership: {
        code: 200,
        mwgCode: 'MWG_CIAM_USERS_LOGOUT_SUCCESS',
        message: messageLang('logout_success', body.language),
        email: body.email,
        mandaiId: body.mandaiId,
      },
      status: 'success',
      statusCode: 200,
    };
  }

  async perform(token, body) {
    try {
      await UserLogoutService.execute(token, body);
      return this.success(body);
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      throw new Error(JSON.stringify(errorMessage));
    }
  }
}

module.exports = new UserLogoutJob();
