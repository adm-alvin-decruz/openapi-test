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
        mwgCode: "MWG_CIAM_UPDATE_MEMBERSHIP_PASS_ERR",
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
        mwgCode: "MWG_CIAM_PARAMS_ERR",
        message: "Wrong parameters",
        error: {
          [`${key}`]: messageLang(`membership_pass_${key}`, lang),
        },
      },
      status: "failed",
      statusCode: 400,
    };
  }

  static membershipPassCognitoError(lang = "en") {
    return {
      membership: {
        code: 500,
        mwgCode: "MWG_CIAM_MEMBERSHIP_PASS_COGNITO_ERR",
        message: messageLang("membership_pass_cognito_error", lang),
      },
      status: "failed",
      statusCode: 500,
    };
  }

  static membershipPassS3Error(lang = "en") {
    return {
      membership: {
        code: 500,
        mwgCode: "MWG_CIAM_MEMBERSHIP_PASS_S3_ERR",
        message: messageLang("membership_pass_s3_error", lang),
      },
      status: "failed",
      statusCode: 500,
    };
  }

  static membershipPassSQSError(lang = "en") {
    return {
      membership: {
        code: 500,
        mwgCode: "MWG_CIAM_MEMBERSHIP_PASS_SQS_ERR",
        message: messageLang("membership_pass_sqs_error", lang),
      },
      status: "failed",
      statusCode: 500,
    };
  }

  static membershipPassExistedError(email, lang = "en") {
    return {
      membership: {
        code: 400,
        mwgCode: "MWG_CIAM_MEMBERSHIP_PASS_EXIST_ERR",
        message: messageLang("membership_pass_existed_error", lang),
        email: email
      },
      status: "failed",
      statusCode: 400,
    };
  }
}

module.exports = MembershipPassErrors;
