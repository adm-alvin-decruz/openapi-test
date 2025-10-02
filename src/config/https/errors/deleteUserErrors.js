const { messageLang } = require('../../../utils/common');

class DeleteUserErrors {
  static ciamDeleteUserUnable(lang) {
    return {
      user: {
        code: 400,
        mwgCode: 'MWG_CIAM_DELETE_USER_FAILED',
        message: messageLang('delete_user_unable', lang),
      },
      status: 'failed',
      statusCode: 400,
    };
  }
}

module.exports = DeleteUserErrors;
