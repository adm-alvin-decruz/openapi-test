const commonService = require('../../../../services/commonService');
const loggerService = require('../../../../logs/logger');
const createChallenge = require('./createChallenge');
const verifyChallenge = require('./verifyChallenge');
const { safeJsonParse } = require('../passwordless/passwordlessSendCodeHelpers');

async function sendCode(req) {
  // clean the request data for possible white space
  req['body'] = commonService.cleanData(req.body);

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

    return await createChallenge(req);
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
    // const errorMessage = JSON.parse(error.message);
    // throw new Error(JSON.stringify(errorMessage));
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

async function verifyCode(req) {
  // Extract and clean the data
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

    // const errorMessage = JSON.parse(error.message);
    // throw new Error(JSON.stringify(errorMessage));
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
