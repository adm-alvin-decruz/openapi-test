const UserLoginService = require("./userLoginServices");

class UserLoginJob {
  failed(error) {
    throw JSON.stringify(error);
  }

  success(result) {
    return result;
  }

  async execute(req) {
    await UserLoginService.execute(req);
    return UserLoginService.user;
  }

  async perform(token) {
    //execute login process
    const rs = await this.execute(token);
    if (rs.errorMessage) {
      return this.failed(rs.errorMessage);
    }
    return this.success(rs);
  }
}

module.exports = new UserLoginJob();
