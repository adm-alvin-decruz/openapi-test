const { messageLang } = require("../../../utils/common");

class MembershipPassErrors {
  static createMembershipPassError(lang = "en") {
    return {
      membership: {
        code: 500,
        mwgCode: "MWG_CIAM_CREATE_MEMBERSHIP_PASS_ERR",
        message: messageLang("membership_pass_create_error", lang),
      },
      status: "failed",
      statusCode: 500,
    };
  }

  static updateMembershipPassError(lang = "en") {
    return {
      membership: {
        code: 500,
        mwgCode: "MWG_CIAM_CREATE_MEMBERSHIP_PASS_ERR",
        message: messageLang("membership_pass_update_error", lang),
      },
      status: "failed",
      statusCode: 500,
    };
  }

  static membershipPassParamsError(key, lang = "en") {
    return {
      membership: {
        code: 400,
        mwgCode: "MWG_CIAM_MEMBERSHIP_PASS_PARAMS_ERR",
        message: "Wrong parameters",
        error: {
          [`${key}`]: messageLang(`membership_pass_${key}`, lang),
        },
      },
      status: "failed",
      statusCode: 400,
    };
  }
}

module.exports = MembershipPassErrors;
