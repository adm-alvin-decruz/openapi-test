const UserGetMembershipPassesService = require("./userGetMembershipPassesService");
const { messageLang } = require("../../utils/common");

class UserGetMembershipPassesJob {
  success(rs, lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_USERS_MY_MEMBERSHIP_SUCCESS",
        message: messageLang("get_membership_success", lang),
        passes: rs.passes,
      },
      status: "success",
      statusCode: 200,
    };
  }

  async perform(body) {
    // trim input
    Object.keys(body).forEach(key => {
      if (typeof body[key] === 'string') {
        body[key] = body[key].trim();
      }
    });

    try {
      const rs = await UserGetMembershipPassesService.execute(body);
      return this.success(rs, body.language);
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      throw new Error(JSON.stringify(errorMessage));
    }
  }
}

module.exports = new UserGetMembershipPassesJob();
