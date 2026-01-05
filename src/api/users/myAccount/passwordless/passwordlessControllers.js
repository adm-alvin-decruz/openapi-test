const commonService = require('../../../../services/commonService');
const loggerService = require('../../../../logs/logger');
const {
  cognitoInitiatePasswordlessLogin,
  cognitoVerifyPasswordlessLogin,
} = require('../../../../services/cognitoService');
const { messageLang } = require('../../../../utils/common');
const PasswordlessErrors = require('../../../../config/https/errors/passwordlessErrors');
const { getUserFromDBCognito } = require('../../helpers/userUpdateMembershipPassesHelper');
const { updateUser } = require('../../userLoginServices');
const { createEvent, updateEventStatus } = require('../../userCredentialEventService');
const { EVENTS, STATUS } = require('../../../../utils/constants');
const {
  incrementAttemptById,
  markTokenAsInvalid,
  getTokenById,
} = require('../../../../db/models/passwordlessTokenModel');
const { updateTokenSession } = require('./passwordlessSendCodeServices');
const configsModel = require('../../../../db/models/configsModel');
const { update } = require('../../../../db/models/userModel');
const appConfig = require('../../../../config/appConfig');
const cryptoEnvelope = require('../../../../utils/cryptoEnvelope');
const { getLastLoginEvent } = require('../../../../db/models/userCredentialEventsModel');

async function sendCode(req) {
  req.body = commonService.cleanData(req.body);
  const { email } = req.body;

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

    // CIAM-595: Get user info and create SEND_OTP event BEFORE calling Cognito
    // This prevents race condition where concurrent requests both pass cooldown check
    const { db: userInfo } = await getUserFromDBCognito(email);
    const eventResult = await createEvent(
      {
        eventType: EVENTS.SEND_OTP,
        data: { email, pending: true },
        source: 7,
        status: STATUS.SUCCESS,
      },
      userInfo.id,
    );
    const eventId = eventResult?.id;
    console.log('[passwordlessControllers.sendCode] Created SEND_OTP event before Cognito call');

    let cognitoRes;
    try {
      cognitoRes = await cognitoInitiatePasswordlessLogin(email);
    } catch (error) {
      if (eventId) {
        try {
          await updateEventStatus(eventId, STATUS.FAILED);
        } catch (updateError) {
          loggerService.error(
            {
              user: {
                email: req.body.email,
                layer: 'controller.sendCode',
                error: `${updateError}`,
              },
            },
            {},
            '[CIAM] Send Code - Failed to update event status',
          );
        }
      }
      throw error;
    }
    console.log(
      '[passwordlessControllers.sendCode] Run Cognito AdminInitiateAuth:',
      JSON.stringify(cognitoRes),
    );

    // Update user_credential_events table with AWS session
    await updateTokenSession(email, cognitoRes.session);
    console.log('[passwordlessControllers.sendCode] updated token session in DB');

    return {
      auth: {
        method: 'passwordless',
        code: 200,
        mwgCode: 'MWG_CIAM_USERS_OTP_SENT_SUCCESS',
        message: messageLang('sendCode_success', req.body.language),
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

  const { code, email } = req.body;
  let newAwsSession; // To hold new Cognito session for further attempts if current verification fails

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

    // Get user info from DB & Cognito
    const { db: userInfoDb, cognito: userInfoCognito } = await getUserFromDBCognito(email);
    console.log(
      '[passwordlessControllers.verifyCode] User info:',
      JSON.stringify({ userInfoDb, userInfoCognito }),
    );

    // Increment token attempt in DB
    await incrementAttemptById(tokenId);
    console.log('[passwordlessControllers.verifyCode] Incremented token attempt');

    // If token attempt reaches max no. of attempts, invalidate token (block further verification attempts on this token)
    const MAX_ATTEMPTS = await configsModel.getValueByConfigValueName(
      'passwordless-otp',
      'otp-config',
      'otp_max_attempt',
    );
    const { verification_attempts: attempts } = await getTokenById(tokenId);
    console.log(
      `[passwordlessControllers.verifyCode] max attempts: ${MAX_ATTEMPTS} / current attempts: ${attempts}`,
    );
    if (attempts === MAX_ATTEMPTS) {
      await markTokenAsInvalid(tokenId);
      console.log('[passwordlessControllers.verifyCode] Invalidated token since 5th attempt');
    }

    // Retrieve and decrypt session from DB
    const { data } = await getLastLoginEvent(userInfoDb.id);
    const encryptedSession = data.aws_session;
    const session = await cryptoEnvelope.decrypt(encryptedSession);
    console.log('[passwordlessControllers.verifyCode] Retrieved decrypted AWS session from DB');
    const cognitoRes = await cognitoVerifyPasswordlessLogin(code, session, email);
    console.log(
      '[passwordlessControllers.verifyCode] Run Cognito AdminRespondToAuth:',
      JSON.stringify(cognitoRes),
    );

    if (!cognitoRes.accessToken) {
      newAwsSession = await cryptoEnvelope.encrypt(cognitoRes.session);
      // If verification fails on last available attempt, disable login for 15 min
      if (attempts === MAX_ATTEMPTS) {
        const updateResult = await update(userInfoDb.id, { status: 2 });
        console.log(
          '[passwordlessControllers.verifyCode] Login is disabled for user account.',
          updateResult,
        );
        throw new Error(JSON.stringify(PasswordlessErrors.loginDisabled(email, 900)));
      }
      throw new Error(JSON.stringify(PasswordlessErrors.verifyOtpError(email)));
    }

    // If verification succeeds, mark token as invalid (used)
    await markTokenAsInvalid(tokenId);
    console.log(
      '[passwordlessControllers.verifyCode] Verification succeeded - token marked as invalid',
    );

    // Update user_credentials and user_credential_events tables with login info
    await updateUser(userInfoDb.id, cognitoRes);
    await createEvent(
      {
        eventType: EVENTS.VERIFY_OTP,
        data: { tokenId, code, session },
        source: 7,
        status: STATUS.SUCCESS,
      },
      userInfoDb.id,
    );
    await createEvent(
      {
        eventType: EVENTS.LOGIN,
        data: req.body.email,
        source: 1,
        status: STATUS.SUCCESS,
      },
      userInfoDb.id,
    );

    // Form AEM callback URL
    const callbackURL = `${appConfig[`AEM_CALLBACK_URL_${process.env.APP_ENV.toUpperCase()}`]}${appConfig.AEM_CALLBACK_PATH}`;

    return {
      auth: {
        code: 200,
        mwgCode: 'MWG_CIAM_USERS_LOGIN_SUCCESS',
        message: messageLang('login_success'),
        accessToken: cognitoRes.accessToken,
        mandaiId: userInfoDb.mandai_id,
        callbackURL,
        email: userInfoDb.email,
      },
      status: 'success',
      statusCode: 200,
    };
  } catch (error) {
    // Log failed verification attempt in user_credential_events table
    await createEvent(
      {
        eventType: EVENTS.VERIFY_OTP,
        data: { tokenId, aws_session: newAwsSession },
        source: 7,
        status: STATUS.FAILED,
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
