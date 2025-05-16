const UserRefreshTokenService = require("./userRefreshTokenService");
const appConfig = require("../../config/appConfig");
const loggerService = require("../../logs/logger");

class UserRefreshAccessTokenJob {
  constructor() {
    this.callbackUrl = `${
        appConfig[`AEM_CALLBACK_URL_${process.env.APP_ENV.toUpperCase()}`]
    }${appConfig.AEM_CALLBACK_PATH}`;
  }

  success(rs, body) {
    return rs.email
      ? {
          token: {
            code: 200,
            valid: rs.valid,
            expired_at: rs.expired_at,
            email: rs.email,
            mandaiId: body.mandaiId,
            callbackURL: this.callbackUrl,
          },
          status: "success",
          statusCode: 200,
        }
      : {
          token: {
            code: 200,
            valid: rs.valid,
            expired_at: rs.expired_at,
            mandaiId: body.mandaiId,
            callbackURL: this.callbackUrl,
          },
          status: "success",
          statusCode: 200,
        };
  }

  async perform(accessToken, body) {
    try {
      const rs = await UserRefreshTokenService.execute(accessToken, body);
      loggerService.log(
        {
          user: {
            action: "userRefreshAccessToken",
            layer: "UserRefreshAccessTokenJob.perform",
            response: JSON.stringify(rs),
          },
        },
        "[CIAM] userRefreshAccessToken Success"
      );
      return this.success(rs, body);
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      throw new Error(JSON.stringify(errorMessage));
    }
  }
}

module.exports = new UserRefreshAccessTokenJob();
