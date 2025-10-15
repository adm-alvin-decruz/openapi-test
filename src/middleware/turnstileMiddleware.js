const axios = require('axios');
const loggerService = require('../logs/logger');
const CommonErrors = require('../config/https/errors/commonErrors');
const { messageLang } = require('../utils/common');
const { secrets } = require('../services/secretsService');

async function generateUUID() {
  const { v4: uuidv4 } = await import('uuid');
  return uuidv4();
}

function captchaError(lang) {
  return {
    auth: {
      code: 403,
      mwgCode: 'MWG_CIAM_CAPTCHA_ERROR',
      message: messageLang('captchaError', lang),
    },
    status: 'error',
    statusCode: 403,
  };
}

function missingTokenError(lang) {
  return {
    auth: {
      code: 400,
      mwgCode: 'MWG_CIAM_CAPTCHA_TOKEN_MISSING',
      message: messageLang('captchaMissing', lang),
    },
    status: 'error',
    statusCode: 400,
  };
}

function missingSecretKeyError(lang) {
  return {
    auth: {
      code: 500,
      mwgCode: 'MWG_CIAM_CAPTCHA_SECRET_MISSING',
      message: messageLang('captchaSecretKeyMissing', lang),
    },
    status: 'error',
    statusCode: 500,
  };
}

async function verifyTurnstile(req, res, next) {
  const email = req.body.email || req.query.email || 'unknown';
  const token = req.body.token;
  const lang = req.body.language || req.query.language || 'en';

  loggerService.log(
    {
      user: {
        email,
        layer: 'Middleware.verifyTurnstile',
        action: 'start',
        message: 'Starting Turnstile verification',
      },
    },
    '[CIAM] Captcha Verification Start',
  );

  try {
    const ciamSecrets = await secrets.getSecrets('ciam-microservice-lambda-config');
    const turnstileSecret = ciamSecrets.CLOUDFLARE_TURNSTILE_SECRET_KEY;
    if (!turnstileSecret) {
      loggerService.error(
        {
          user: {
            email,
            layer: 'Middleware.verifyTurnstile',
            action: 'missing-secret',
          },
        },
        {},
        '[CIAM] Turnstile secret not configured',
      );
      return res.status(500).json(missingSecretKeyError(lang));
    }

    if (!token) {
      loggerService.error(
        {
          user: {
            email,
            layer: 'Middleware.verifyTurnstile',
            action: 'missing-token',
          },
        },
        {},
        '[CIAM] Turnstile token missing',
      );
      return res.status(400).json(missingTokenError(lang));
    }

    const remoteip =
      (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
      req.socket?.remoteAddress;

    const res = await axios.post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        secret: turnstileSecret,
        response: token,
        remoteip: remoteip,
        idempotency_key: await generateUUID(),
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const data = res.data;

    if (!data?.success) {
      loggerService.error(
        {
          user: {
            email,
            layer: 'Middleware.verifyTurnstile',
            action: 'verification-failed',
            details: data?.['error-codes'] || [],
          },
        },
        {},
        '[CIAM] Captcha Verification Failed',
      );

      return res.status(403).json(captchaError(lang));
    }

    loggerService.log(
      {
        user: {
          email,
          layer: 'Middleware.verifyTurnstile',
          action: 'verification-success',
        },
      },
      '[CIAM] Captcha Verification Success',
    );

    req.turnstile = { ok: true, meta: data };
    next();
  } catch (e) {
    loggerService.log(
      {
        user: {
          email,
          layer: 'Middleware.verifyTurnstile',
          error: new Error(e),
        },
      },
      '[CIAM] Captcha Verification Exception',
    );
    return res.status(500).json(CommonErrors.InternalServerError());
  }
}

module.exports = { verifyTurnstile };
