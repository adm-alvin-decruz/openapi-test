const {messageLang} = require("../../../utils/common");

class CommonErrors {
  static NotImplemented() {
    return {
      membership: {
        code: 501,
        mwgCode: "MWG_CIAM_NOT_IMPLEMENTED",
        message: "Not implemented",
      },
      status: "failed",
      statusCode: 501,
    };
  }
  static InternalServerError() {
    return {
      membership: {
        code: 500,
        mwgCode: "MWG_CIAM_INTERNAL_SERVER_ERROR",
        message: "Internal Server Error",
      },
      status: "failed",
      statusCode: 500,
    };
  }
  static BadRequest(key, message, lang) {
    return {
      membership: {
        code: 400,
        mwgCode: "MWG_CIAM_PARAMS_ERR",
        message: "Wrong parameters",
        error: {
          [`${key}`]: messageLang(message, lang),
        },
      },
      status: "failed",
      statusCode: 400,
    }
  }
}

module.exports = CommonErrors;
