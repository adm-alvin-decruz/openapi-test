const crypto = require('crypto');
const CommonErrors = require('../../../../config/https/errors/commonErrors');
const loggerService = require('../../../../logs/logger');
const tokenModel = require('../../../../db/models/passwordlessTokenModel');
const failedJobsModel = require('../../../../db/models/failedJobsModel');
const passwordlessVerifyCodeHelper = require('./passwordlessVerifyCodeHelpers');
const { secrets } = require('../../../../services/secretsService');
const PasswordlessSendCodeService = require('./passwordlessSendCodeServices');

class PasswordlessVerifyCodeService {
  async shouldVerify(req) {
    const { email, code } = req.body;

    if (!code) {
      return { proceed: false, reason: 'not_found' };
    }

    // Check if magic link is provided
    const isMagicLink = !!req.query?.token?.trim();
    if (isMagicLink) {
      const decryptedToken = await PasswordlessVerifyCodeService.decryptMagicToken(req);
      req.body.email = decryptedToken.email;
      req.body.code = decryptedToken.otp;
    }

    // Check if last retrieved token is valid for verification
    const token = await tokenModel.findLatestTokenByEmail(email);

    if (!token) {
      return { proceed: false, reason: 'not_found' };
    }

    if (token.is_used === 1) {
      return { proceed: false, reason: 'used' };
    }

    const now = new Date();
    if (new Date(token.expired_at) < now) {
      return { proceed: false, reason: 'expired' };
    }

    const MAX_ATTEMPTS = await PasswordlessSendCodeService.getValueByConfigValueName(
      'passwordless-otp',
      'otp-config',
      'otp_max_attempt',
    );
    if (token.attempt >= MAX_ATTEMPTS) {
      return { proceed: false, reason: 'rate_limit' };
    }

    return { proceed: true, tokenId: token.id, isMagic: isMagicLink };
  }

  async mapToVerifyErrorToHelperKey(reason) {
    const map = {
      missing_email: 'invalid',
      not_found: 'notFound',
      used: 'used',
      expired: 'expired',
      rate_limit: 'rateLimit',
    };
    return map[reason] || 'notFound';
  }

  async getTokenDB(email) {
    try {
      const token = await tokenModel.findLatestTokenByEmail(email);

      this.loggerWrapper('[CIAM] End getValidTokenDB at PasswordlessVerifyCode Service - Success', {
        layer: 'passwordlessVerifyCodeService.validateOTP',
        action: 'performVerifyOTP.getTokenDB',
        email: email,
      });

      return token;
    } catch (error) {
      this.loggerWrapper(
        '[CIAM] End getValidTokenDB at PasswordlessVerifyCode Service - Failed',
        {
          layer: 'passwordlessVerifyCodeService.validateOTP',
          action: 'performVerifyOTP.getTokenDB',
          error: new Error(error),
          email: email,
        },
        'error',
      );
      await failedJobsModel.create({
        uuid: crypto.randomUUID(),
        name: 'failedGettingOTPTokenInformation',
        action: 'failed',
        data: {
          email: email,
        },
        source: 2,
        triggered_at: null,
        status: 0,
      });
    }
  }

  async incrementTokenAttemptDB(id) {
    try {
      await tokenModel.incrementAttemptById(id);
    } catch (error) {
      this.loggerWrapper(
        '[CIAM] End incrementTokenAttempt at PasswordlessVerifyCode Service - Failed',
        {
          layer: 'passwordlessVerifyCodeService.validateOTP',
          action: 'incrementTokenAttempt',
          error: new Error(error),
          tokenId: id,
        },
        'error',
      );
      throw new Error(JSON.stringify(CommonErrors.NotImplemented()));
    }
  }

  async markTokenAsUsedDB(id) {
    try {
      return await tokenModel.markTokenById(id); // Returns true or false
    } catch (error) {
      this.loggerWrapper(
        '[CIAM] End markTokenAsUsed at PasswordlessVerifyCode Service - Failed',
        {
          layer: 'passwordlessVerifyCodeService.validateOTP',
          action: 'markTokenAsUsed',
          error: new Error(error),
          tokenId: id,
        },
        'error',
      );
    }
  }

  async decryptMagicToken(req) {
    const base64token = req.query.token;

    if (!base64token) {
      throw new Error(
        JSON.stringify(passwordlessVerifyCodeHelper.getTokenError('missing', req, true)),
      );
    }

    try {
      const ciamSecrets = await secrets.getSecrets('ciam-microservice-lambda-config');
      const ALGORITHM = process.env.AES_ALGORITHM || 'aes-256-gcm';
      const KEY = Buffer.from(ciamSecrets.AES_SECRET_KEY, 'hex');

      const data = Buffer.from(base64token, 'base64url');

      // Split the buffer into iv, authTag, and encrypted payload
      const iv = data.subarray(0, 12);
      const authTag = data.subarray(12, 28);
      const encrypted = data.subarray(28);

      const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      const decryptedToken = JSON.parse(decrypted);

      if (Date.now() > decryptedToken.expiredAt) {
        throw new Error(
          JSON.stringify(passwordlessVerifyCodeHelper.getTokenError('expired', req, true)),
        );
      }

      return decryptedToken;
    } catch (error) {
      this.loggerWrapper(
        '[CIAM] End decryptMagicToken at PasswordlessVerifyCode Service - Failed',
        {
          layer: 'passwordlessVerifyCodeService.decryptMagicToken',
          action: 'verifyCode.decryptMagicToken',
          error: new Error(error),
        },
        'error',
      );
      throw new Error(
        JSON.stringify(passwordlessVerifyCodeHelper.getTokenError('invalid', req, true)),
      );
    }
  }

  loggerWrapper(action, loggerObj, type = 'logInfo') {
    if (type === 'error') {
      return loggerService.error({ passwordlessSendCodeService: { ...loggerObj } }, {}, action);
    }

    return loggerService.log({ passwordlessSendCodeService: { ...loggerObj } }, action);
  }
}

module.exports = new PasswordlessVerifyCodeService();
