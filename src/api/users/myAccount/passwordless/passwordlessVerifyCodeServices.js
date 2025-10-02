const crypto = require('crypto');
const CommonErrors = require('../../../../config/https/errors/commonErrors');
const PasswordService = require('../../userPasswordService');
const loggerService = require('../../../../logs/logger');
const tokenModel = require('../../../../db/models/passwordlessTokenModel');
const failedJobsModel = require('../../../../db/models/failedJobsModel');
const configsModel = require('../../../../db/models/configsModel');
const passwordlessVerifyCodeHelper = require('./passwordlessVerifyCodeHelpers');
const { secrets } = require('../../../../services/secretsService');
const PasswordlessSendCodeService = require('./passwordlessSendCodeServices');

class PasswordlessVerifyCodeService {
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

  async validateToken(req) {
    // check if validating magic link token
    const isMagic = !!req.query?.token?.trim();

    const MAX_ATTEMPTS = await PasswordlessSendCodeService.getValueByConfigValueName(
      'passwordless-otp',
      'otp-config',
      'otp_max_attempt',
    );

    const email = req.body.email;
    const otp = req.body.code;

    // otp is empty
    if (!otp) {
      throw new Error(
        JSON.stringify(passwordlessVerifyCodeHelper.getTokenError('invalid', req, isMagic)),
      );
    }

    try {
      const token = await this.getTokenDB(email);

      // token doesn't exist in token DB
      if (!token) {
        throw new Error(
          JSON.stringify(passwordlessVerifyCodeHelper.getTokenError('notFound', req, isMagic)),
        );
      }
      // token is already used
      const isUsed = token.is_used === 1;
      if (isUsed) {
        throw new Error(
          JSON.stringify(passwordlessVerifyCodeHelper.getTokenError('used', req, isMagic)),
        );
      }
      // token is epxired
      const now = new Date();
      if (new Date(token.expired_at) < now) {
        await this.markTokenAsUsedDB(token.id);
        throw new Error(
          JSON.stringify(passwordlessVerifyCodeHelper.getTokenError('expired', req, isMagic)),
        );
      }
      // too many wrong attempts
      const tooManyAttempts = (token.attempt || 0) > MAX_ATTEMPTS;
      if (tooManyAttempts) {
        await this.markTokenAsUsedDB(token.id);
        throw new Error(
          JSON.stringify(passwordlessVerifyCodeHelper.getTokenError('rateLimit', req, isMagic)),
        );
      }
      // check whether OTP matches
      const isValid = await PasswordService.comparePassword(otp, token.hash);
      if (!isValid) {
        await this.incrementTokenAttemptDB(token.id);
        throw new Error(
          JSON.stringify(passwordlessVerifyCodeHelper.getTokenError('invalid', req, isMagic)),
        );
      }
      // validation passed
      const markSuccess = await this.markTokenAsUsedDB(token.id);
      // If the token was already used by a concurrent request
      // (just before this), treat as a failed attempt.
      if (!markSuccess) {
        throw new Error(
          JSON.stringify(passwordlessVerifyCodeHelper.getTokenError('invalid', req, isMagic)),
        );
      }
      const pw = otp + token.salt;

      return pw;
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      throw new Error(JSON.stringify(errorMessage));
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
    } catch (err) {
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
