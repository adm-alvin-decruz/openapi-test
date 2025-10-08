const crypto = require('crypto');
const loggerService = require('../../../../logs/logger');
const tokenModel = require('../../../../db/models/passwordlessTokenModel');
const { secrets } = require('../../../../services/secretsService');
const PasswordlessSendCodeService = require('./passwordlessSendCodeServices');
const PasswordlessErrors = require('../../../../config/https/errors/passwordlessErrors');
const { getUserFromDBCognito } = require('../../helpers/userUpdateMembershipPassesHelper');

class PasswordlessVerifyCodeService {
  async shouldVerify(req) {
    // Check if magic link is provided
    const isMagicLink = !!req.query?.token?.trim();
    if (isMagicLink) {
      const decryptedToken = await PasswordlessVerifyCodeService.decryptMagicToken(req);
      req.body.email = decryptedToken.email;
      req.body.code = decryptedToken.otp;
    }

    const { email, code } = req.body;

    // Check if verification token is provided
    if (!code) {
      return { proceed: false, error: { reason: 'missing_token' } };
    }

    // Check user status. If status = 2 (login disabled), reject verify OTP request
    const userInfo = await getUserFromDBCognito(email);
    const isLoginDisabled = await PasswordlessSendCodeService.checkLoginDisabled(userInfo.db);
    if (isLoginDisabled.disabled) {
      return {
        proceed: false,
        error: { reason: 'login_disabled', secondsRemaining: isLoginDisabled.secondsRemaining },
      };
    }

    // Check if last retrieved token is valid for verification
    const token = await tokenModel.findLatestTokenByEmail(email);
    if (!token) {
      return { proceed: false, error: { reason: 'not_found' } };
    }

    if (token.is_valid === 0) {
      return { proceed: false, error: { reason: 'invalid' } };
    }

    const now = new Date();
    if (new Date(token.expires_at) < now) {
      return { proceed: false, error: { reason: 'expired' } };
    }

    return { proceed: true, tokenId: token.id, isMagic: isMagicLink };
  }

  async decryptMagicToken(req) {
    const base64token = req.query.token;

    if (!base64token) {
      throw new Error(
        JSON.stringify(this.mapVerifyFailureToError(req, { reason: 'missing_token' }, true)),
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
          JSON.stringify(this.mapVerifyFailureToError(req, { reason: 'expired' }, true)),
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
        JSON.stringify(this.mapVerifyFailureToError(req, { reason: 'invalid' }, true)),
      );
    }
  }

  mapVerifyFailureToError(req, error, isMagicLink) {
    const { email, lang } = req.body;
    const { reason } = error;
    const errorMap = {
      expired: isMagicLink
        ? PasswordlessErrors.verifyMagicLinkError(lang)
        : PasswordlessErrors.expiredError(email, lang),
      missing_token: PasswordlessErrors.tokenMissingError(lang),
      invalid: isMagicLink
        ? PasswordlessErrors.verifyMagicLinkError(lang)
        : PasswordlessErrors.verifyOtpError(email, lang),
      not_found: isMagicLink
        ? PasswordlessErrors.verifyMagicLinkError(lang)
        : PasswordlessErrors.verifyOtpError(email, lang),
      missing_email: isMagicLink
        ? PasswordlessErrors.verifyMagicLinkError(lang)
        : PasswordlessErrors.verifyOtpError(email, lang),
      login_disabled: PasswordlessErrors.loginDisabled(email, error.secondsRemaining),
    };

    return errorMap[reason];
  }

  loggerWrapper(action, loggerObj, type = 'logInfo') {
    if (type === 'error') {
      return loggerService.error({ passwordlessSendCodeService: { ...loggerObj } }, {}, action);
    }

    return loggerService.log({ passwordlessSendCodeService: { ...loggerObj } }, action);
  }
}

module.exports = new PasswordlessVerifyCodeService();
