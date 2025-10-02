// src/api/users/myAccount/passwordless/verifyChallenge.js
const PasswordlessVerifyCodeService = require('./passwordlessVerifyCodeServices');
const UserLoginService = require('../../userLoginServices');
const { messageLang } = require('../../../../utils/common');
const appConfig = require('../../../../config/appConfig');
const { getOrCreateBridgePassword } = require('./passwordlessBridgeService');

/**
 * Verify
 * Validate OTP (mark used, attempts, expiry)
 * Use returned pw to login via Cognito
 */
module.exports = async function verifyChallenge(req) {
  const callbackUrl = `${
    appConfig[`AEM_CALLBACK_URL_${process.env.APP_ENV.toUpperCase()}`]
  }${appConfig.AEM_CALLBACK_PATH}`;

  try {
    //Magic link support
    const isMagicLink = !!req.query?.token?.trim();
    if (isMagicLink && !req.body?.email && !req.body?.code) {
      const decryptedToken = await PasswordlessVerifyCodeService.decryptMagicToken(req);
      req.body.email = decryptedToken.email;
      req.body.code = decryptedToken.otp;
    }

    //Validate OTP (expiry, attempts, hash compare, mark used) prevents overlap
    //service returns pw = otp + token.salt
    await PasswordlessVerifyCodeService.validateToken(req);

    //Obtain bridge password for Cognito login
    const bridgePassword = await getOrCreateBridgePassword(req.body.email);
    req.isPasswordless = true;
    req.body.password = bridgePassword;

    const loginResult = await UserLoginService.execute(req);

    const language = isMagicLink ? req.query.language : req.body.language;
    return {
      auth: {
        code: 200,
        mwgCode: 'MWG_CIAM_USERS_LOGIN_SUCCESS',
        message: messageLang('login_success', language),
        accessToken: loginResult.accessToken,
        mandaiId: loginResult.mandaiId,
        email: loginResult.email,
        callbackURL: callbackUrl,
      },
      status: 'success',
      statusCode: 200,
    };
  } catch (err) {
    const errorMessage = JSON.parse(err.message);
    throw new Error(JSON.stringify(errorMessage));
  }
};
