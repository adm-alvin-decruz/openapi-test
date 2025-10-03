const crypto = require('crypto');
const loggerService = require('../../../../logs/logger');
const tokenModel = require('../../../../db/models/passwordlessTokenModel');
const failedJobsModel = require('../../../../db/models/failedJobsModel');
const { maskKeyRandomly } = require('../../../../utils/common');
const configsModel = require('../../../../db/models/configsModel');
const { switchIsTurnOn } = require('../../../../helpers/dbSwitchesHelpers');
const {
  getUserFromDBCognito,
  isUserExisted,
} = require('../../helpers/userUpdateMembershipPassesHelper');

class PasswordlessSendCodeService {
  async getValueByConfigValueName(config, key, valueName) {
    try {
      const cfg = await configsModel.findByConfigKey(config, key);

      let value;
      value = cfg.value;
      if (!(valueName in value)) {
        throw new Error(`Value name '${valueName}' not found in config ${config}/${key}`);
      }

      return value[valueName];
    } catch (err) {
      this.loggerWrapper(
        '[CIAM] getValueByConfigValueName - Failed',
        {
          layer: 'passwordlessSendCodeService',
          action: 'getValueByConfigValueName',
          error: err.message,
        },
        'error',
      );
      throw err;
    }
  }

  async saveTokenDB(tokenData) {
    const hash = tokenData.hash;
    const salt = tokenData.salt;
    const expiredAt = tokenData.expiredAt;

    try {
      const tokenDB = await tokenModel.create(tokenData);

      this.loggerWrapper('[CIAM] End saveTokenDB at PasswordlessSendCode Service - Success', {
        layer: 'passwordlessSendCodeService.generateCode',
        action: 'sendCode.saveTokenDB',
        hash: maskKeyRandomly(hash),
        salt,
        expiredAt,
      });

      return tokenDB;
    } catch (error) {
      this.loggerWrapper(
        '[CIAM] End saveUserDB at PasswordlessSendCode Service - Failed',
        {
          layer: 'passwordlessSendCodeService.generateCode',
          action: 'sendCode.saveTokenDB',
          error: new Error(error),
          hash: maskKeyRandomly(hash),
          salt,
          expiredAt,
        },
        'error',
      );
      await failedJobsModel.create({
        uuid: crypto.randomUUID(),
        name: 'failedSavingTokenInformation',
        action: 'failed',
        data: {
          hash: maskKeyRandomly(hash),
          salt,
          expiredAt,
        },
        source: 2,
        triggered_at: null,
        status: 0,
      });
      throw error;
    }
  }

  /**
   * Decide whether to issue a challenge.
   */
  async shouldIssueChallenge(req) {
    const { email, purpose = 'login' } = req.body || {};

    // Check if passwordless switches are enabled
    const sendEnabled = await switchIsTurnOn('passwordless_enable_send_otp');
    const signupSendEnabled = await switchIsTurnOn('passwordless_enable_send_sign_up_email');

    if (purpose === 'signup') {
      if (!signupSendEnabled) {
        return { proceed: false, reason: 'send_disabled_signup' };
      }
    }

    if (!sendEnabled) {
      return { proceed: false, reason: 'send_disabled_login' };
    }

    // Check if new OTP should be generated
    const OTP_INTERVAL = await this.getValueByConfigValueName(
      'passwordless-otp',
      'otp-config',
      'otp_interval',
    );
    const allowed = await this.shouldGenerateNewToken(email, OTP_INTERVAL);

    if (!allowed.shouldGenerate) {
      return {
        proceed: false,
        reason: allowed.reason,
      };
    }

    return { proceed: true, purpose };
  }

  mapIssueChallengeReasonToHelperKey(reason) {
    return (
      {
        missing_email: 'invalid',
        too_soon: 'tooSoon',
        new_user: 'newUser',
        send_disabled_login: 'notSupported',
        send_disabled_signup: 'notSupported',
      }[reason] || 'invalid'
    );
  }

  async shouldGenerateNewToken(email, otpInterval) {
    try {
      // Check if there are any existing tokens generated for user email
      const token = await tokenModel.findLatestTokenByEmail(email);

      if (!token) {
        // Check if user currently exists in Cognito & DB
        const userInfo = await getUserFromDBCognito(email);
        const isNewUser = !isUserExisted(userInfo);

        if (isNewUser) return { shouldGenerate: false, reason: 'new_user' };

        return { shouldGenerate: true, reason: null };
      }

      const now = new Date();
      const tokenRequestedAt = new Date(token.requested_at);
      const elapsedMs = now - tokenRequestedAt;
      const intervalMs = Number(otpInterval) * 1000;

      if (elapsedMs >= intervalMs) {
        await tokenModel.markTokenById(token.id); // Mark token as used because new token will be generated
        return { shouldGenerate: true, reason: null };
      }

      return { shouldGenerate: false, reason: 'too_soon' };
    } catch (error) {
      this.loggerWrapper(
        '[CIAM] End shouldGenerateNewToken at PasswordlessSendCode Service - Failed',
        {
          layer: 'passwordlessSendCodeService.generateCode',
          action: 'sendCode.shouldGenerateNewToken',
          error: new Error(error),
          email: email,
          otpInterval: otpInterval,
        },
        'error',
      );
      throw error;
    }
  }

  loggerWrapper(action, loggerObj, type = 'logInfo') {
    if (type === 'error') {
      return loggerService.error({ passwordlessSendCodeService: { ...loggerObj } }, {}, action);
    }

    return loggerService.log({ passwordlessSendCodeService: { ...loggerObj } }, action);
  }
}

module.exports = new PasswordlessSendCodeService();
