const { messageLang } = require("../../../utils/common");

class ValidateTokenErrors {
  static ciamValidateTokenErr(lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_VALIDATE_TOKEN_ERR",
        message: messageLang("passwordToken_invalid", lang),
      },
      status: "success",
      statusCode: 200,
    };
  }
  static ciamValidateTokenExpireErr(lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_VALIDATE_TOKEN_EXPIRED",
        message: messageLang("passwordToken_expired", lang),
      },
      status: "success",
      statusCode: 200,
    };
  }
  static ciamValidateTokenBeingUsedErr(lang) {
    return {
      membership: {
        code: 200,
        mwgCode: "MWG_CIAM_PASSWORD_ERR_03",
        message: messageLang("token_reset_password_being_used", lang),
      },
      status: "success",
      statusCode: 200,
    };
  }
}

module.exports = ValidateTokenErrors;
