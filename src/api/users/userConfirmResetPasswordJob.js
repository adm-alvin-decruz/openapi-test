const UserConfirmResetPasswordService = require('./userConfirmResetPasswordService');

class UserConfirmResetPasswordJob {
  success(message) {
    return message;
  }

  async perform(body, lang) {
    try {
      const rs = await UserConfirmResetPasswordService.execute(body, lang);
      return this.success(rs, lang);
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      throw new Error(JSON.stringify(errorMessage));
    }
  }
}

module.exports = new UserConfirmResetPasswordJob();
