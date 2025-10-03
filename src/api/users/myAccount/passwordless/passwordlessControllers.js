const commonService = require('../../../../services/commonService');
const loggerService = require('../../../../logs/logger');
const {
  cognitoInitiatePasswordlessLogin,
  cognitoVerifyPasswordlessLogin,
} = require('../../../../services/cognitoService');
const { messageLang } = require('../../../../utils/common');
const appConfig = require('../../../../config/appConfig');
const PasswordlessErrors = require('../../../../config/https/errors/passwordlessErrors');
const { incrementTokenAttemptDB, markTokenAsUsedDB } = require('./passwordlessVerifyCodeServices');
const { getUserFromDBCognito } = require('../../helpers/userUpdateMembershipPassesHelper');
const { updateUser } = require('../../userLoginServices');
const { createEvent } = require('../../userCredentialEventService');
const { EVENTS } = require('../../../../utils/constants');

async function sendCode(req) {
  req.body = commonService.cleanData(req.body);
  const { email } = req.body.email;

  try {
    loggerService.log(
      {
        user: {
          email: req.body.email,
          layer: 'controller.sendCode',
        },
      },
      '[CIAM] Start Send OTP Request',
    );

    const cognitoRes = await cognitoInitiatePasswordlessLogin(email);

    return {
      auth: {
        method: 'passwordless',
        code: 200,
        mwgCode: 'MWG_CIAM_USERS_OTP_SENT_SUCCESS',
        message: messageLang('sendCode_success', req.body.language),
        cognitoRes,
      },
      status: 'success',
      statusCode: 200,
    };
  } catch (error) {
    loggerService.error(
      {
        user: {
          email: req.body.email,
          layer: 'controller.sendCode',
          error: `${error}`,
        },
      },
      {},
      '[CIAM] End Send Code Request - Failed',
    );
    throw error;
  }
}

async function verifyCode(req, tokenId) {
  req.body = commonService.cleanData(req.body || {});
  req.query = commonService.cleanData(req.query || {});

  const { code, session, email } = req.body;

  try {
    loggerService.log(
      {
        user: {
          email: req.body.email || '',
          code: req.body.code || '',
          magicToken: req.query.token || '',
          layer: 'controller.verifyCode',
        },
      },
      '[CIAM] Start Verify Code Request',
    );

    // Increment token attempt in DB
    await incrementTokenAttemptDB(tokenId);

    const cognitoRes = await cognitoVerifyPasswordlessLogin(code, session);

    if (!cognitoRes.accessToken) {
      return PasswordlessErrors.verifyOtpError(req.body.email);
    }

    // If verification succeeds, mark token as used
    const markSuccess = await markTokenAsUsedDB(tokenId);
    if (!markSuccess) {
      return PasswordlessErrors.verifyOtpError(req.body.email);
    }

    // Get user info from DB & Cognito
    const { db: userInfoDb, cognito: userInfoCognito } = await getUserFromDBCognito(email);
    console.log('User info:', JSON.stringify({ userInfoDb, userInfoCognito }));

    // Update user_credentials and user_credential_events tables with login info
    await updateUser(userInfoDb.id, cognitoRes);
    await createEvent(
      {
        eventType: EVENTS.LOGIN,
        data: req.body.email,
        source: 1,
        status: 1,
      },
      userInfoDb.id,
    );

    // Form AEM callback URL
    const callbackUrl = `${
      appConfig[`AEM_CALLBACK_URL_${process.env.APP_ENV.toUpperCase()}`]
    }${appConfig.AEM_CALLBACK_PATH}`;

    return {
      auth: {
        code: 200,
        mwgCode: 'MWG_CIAM_USERS_LOGIN_SUCCESS',
        message: messageLang('login_success'),
        accessToken: cognitoRes.accessToken,
        mandaiId: userInfoDb.mandai_id,
        email: userInfoDb.email,
        callbackURL: callbackUrl,
      },
      status: 'success',
      statusCode: 200,
    };
  } catch (error) {
    await createEvent(
      {
        eventType: EVENTS.LOGIN,
        data: req.body.email,
        source: 1,
        status: 0,
      },
      null,
      req.body.email,
    );

    loggerService.error(
      {
        user: {
          email: req.body.email || '',
          code: req.body.code || '',
          magicToken: req.query.token || '',
          layer: 'controller.verifyCode',
          error: `${error}`,
        },
      },
      {},
      '[CIAM] End Verify Code Request - Failed',
    );
    throw error;
  }
}

module.exports = {
  sendCode,
  verifyCode,
};
