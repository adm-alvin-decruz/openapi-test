const UserMembershipPassService = require("./userMembershipPassService");
const { messageLang } = require("../../utils/common");

class UserCreateMembershipPassJob {
  success(lang = "en") {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_CREATE_MEMBERSHIP_PASS_SUCCESS",
        message: messageLang("membership_pass_create_success", lang),
      },
      status: "success",
      statusCode: 200,
    };
  }

  async perform(req) {
    try {
      await UserMembershipPassService.create(req);
      return this.success(req.body.language);
    } catch (error) {
      throw error;
    }
  }
}

class UserUpdateMembershipPassJob {
  success(lang = "en") {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_UPDATE_MEMBERSHIP_PASS_SUCCESS",
        message: messageLang("membership_pass_update_success", lang),
      },
      status: "success",
      statusCode: 200,
    };
  }

  async perform(req) {
    try {
      await UserMembershipPassService.update(req);
      return this.success(req.body.language);
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      throw new Error(JSON.stringify(errorMessage));
    }
  }
}

module.exports = {
  userCreateMembershipPassJob: new UserCreateMembershipPassJob(),
  userUpdateMembershipPassJob: new UserUpdateMembershipPassJob(),
};
