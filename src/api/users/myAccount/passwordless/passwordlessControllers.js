const commonService = require('../../../../services/commonService');
const loggerService = require('../../../../logs/logger');
const verifyChallenge = require('./verifyChallenge');
const { safeJsonParse } = require('../passwordless/passwordlessSendCodeHelpers');
const { cognitoInitiatePasswordlessLogin } = require('../../../../services/cognitoService');
const { messageLang } = require('../../../../utils/common');

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

async function verifyCode(req) {
  req.body = commonService.cleanData(req.body || {});
  req.query = commonService.cleanData(req.query || {});

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

    return await verifyChallenge(req);
  } catch (error) {
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

    const errorMessage = safeJsonParse(error.message);
    if (errorMessage) {
      throw new Error(JSON.stringify(errorMessage));
    }

    throw new Error(
      JSON.stringify({
        status: 'failed',
        statusCode: 500,
        message: error.message || 'Unknown error',
      }),
    );
  }
}

module.exports = {
  sendCode,
  verifyCode,
};
