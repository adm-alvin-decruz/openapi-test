const { messageLang } = require('../../../../utils/common');
const PasswordlessVerifyCodeService = require('./passwordlessVerifyCodeServices');
const UserLoginService = require('../../userLoginServices');
const appConfig = require('../../../../config/appConfig');

class PasswordlessVerifyCodeJob {
  constructor() {
    this.callbackUrl = `${
      appConfig[`AEM_CALLBACK_URL_${process.env.APP_ENV.toUpperCase()}`]
    }${appConfig.AEM_CALLBACK_PATH}`;
  }

  success(result, lang) {
    return {
      auth: {
        code: 200,
        mwgCode: 'MWG_CIAM_USERS_LOGIN_SUCCESS',
        message: messageLang('login_success', lang),
        accessToken: result.accessToken,
        mandaiId: result.mandaiId,
        email: result.email,
        callbackURL: this.callbackUrl,
      },
      status: 'success',
      statusCode: 200,
    };
  }

  async verify(req) {
    try {
      // Check if it's a magic link flow
      const isMagicLink = !!req.query?.token?.trim();

      if (isMagicLink) {
        const decryptedToken = await PasswordlessVerifyCodeService.decryptMagicToken(req);
        req.body.email = decryptedToken.email;
        req.body.code = decryptedToken.otp;
      }

      //refactor verify and validateToken
      req.body.password = await PasswordlessVerifyCodeService.validateToken(req);

      const rs = await UserLoginService.execute(req);
      const language = isMagicLink ? req.query.language : req.body.language;

      return this.success(rs, language);
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      throw new Error(JSON.stringify(errorMessage));
    }
  }
}

module.exports = new PasswordlessVerifyCodeJob();
