const UserLogoutService = require("./userLogoutServices");

class UserLogoutJob {
  failed(error) {
    throw JSON.stringify(error);
  }

  success(result) {
    return result;
  }

  async execute(token) {
    return await UserLogoutService.execute(token);
  }

  async perform(token) {
    //execute logout process
    const rs = await this.execute(token);
    if (rs.errorMessage) {
      return this.failed(rs.errorMessage);
    }
    return this.success(rs);
  }
}

module.exports = new UserLogoutJob();
