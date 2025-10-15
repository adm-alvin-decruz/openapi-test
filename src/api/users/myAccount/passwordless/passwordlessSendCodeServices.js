const loggerService = require('../../../../logs/logger');
const tokenModel = require('../../../../db/models/passwordlessTokenModel');
const configsModel = require('../../../../db/models/configsModel');
const { switchIsTurnOn } = require('../../../../helpers/dbSwitchesHelpers');
const {
  getUserFromDBCognito,
  isUserExisted,
} = require('../../helpers/userUpdateMembershipPassesHelper');
const { update, findByEmail } = require('../../../../db/models/userModel');
const PasswordlessErrors = require('../../../../config/https/errors/passwordlessErrors');
const UserCredentialEventsModel = require('../../../../db/models/userCredentialEventsModel');
const { getResetTimeRemaining } = require('./passwordlessSendCodeHelpers');

class PasswordlessSendCodeService {
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
        return { proceed: false, error: { reason: 'send_disabled_signup' } };
      }
    }

    if (!sendEnabled) {
      return { proceed: false, error: { reason: 'send_disabled_login' } };
    }

    // Check if user currently exists in Cognito & DB; if does not exist, direct user to sign up (sign up currently unsupported)
    const userInfo = await getUserFromDBCognito(email);
    const isNewUser = !isUserExisted(userInfo);
    if (isNewUser) return { proceed: false, error: { reason: 'new_user' } };

    // Check how many OTPs without successful logins before current request
    const OTP_MAX_GENERATIONS = await configsModel.getValueByConfigValueName(
      'passwordless-otp',
      'otp-config',
      'otp_max_generate',
    );
    const isMoreThanMaxGenerations = await this.checkOtpGenerationsWithoutSuccessfulLogin(
      userInfo.db.id,
      OTP_MAX_GENERATIONS,
    );
    if (!isMoreThanMaxGenerations.allow) {
      return {
        proceed: false,
        error: {
          reason: 'login_disabled',
          secondsRemaining: isMoreThanMaxGenerations.secondsRemaining,
        },
      };
    }

    // Check user status. If status = 2 (login disabled), reject send OTP request
    const isLoginDisabled = await this.checkLoginDisabled(userInfo.db);
    if (isLoginDisabled.disabled) {
      return {
        proceed: false,
        error: { reason: 'login_disabled', secondsRemaining: isLoginDisabled.secondsRemaining },
      };
    }

    // Check if new OTP should be generated
    const OTP_INTERVAL = await configsModel.getValueByConfigValueName(
      'passwordless-otp',
      'otp-config',
      'otp_cooldown_interval',
    );
    const { withinCooldown, remainingSeconds } = await this.checkWithinCooldownInterval(
      userInfo.db.id,
      OTP_INTERVAL,
    );
    if (withinCooldown)
      return { proceed: false, error: { reason: 'too_soon', secondsRemaining: remainingSeconds } };

    return { proceed: true, purpose };
  }

  mapIssueChallengeFailureToError(req, error) {
    const { email, lang } = req.body;
    const { reason } = error;
    const errorMap = {
      login_disabled: PasswordlessErrors.loginDisabled(email, error.remainingSeconds),
      too_soon: PasswordlessErrors.sendCodetooSoonFailure(email, lang, error.remainingSeconds),
      new_user: PasswordlessErrors.newUserError(email, lang),
      send_disabled_login: PasswordlessErrors.sendCodeError(email, lang),
      send_disabled_signup: PasswordlessErrors.sendCodeError(email, lang),
      missing_email: PasswordlessErrors.sendCodeError(email, lang),
    };

    return errorMap[reason];
  }

  async checkOtpGenerationsWithoutSuccessfulLogin(userId, maxOtpGenerations) {
    try {
      const otpCount = await UserCredentialEventsModel.countOtpGenerationsSinceLastSuccess(userId);

      if (otpCount >= maxOtpGenerations) {
        // Check if current time is 15 min after last OTP generation
        const lastSendOtpEvent = await UserCredentialEventsModel.getLastSendOTPEvent(userId);
        const { resetTime, secondsRemaining } = await getResetTimeRemaining(
          lastSendOtpEvent.created_at,
        );

        if (secondsRemaining > 0) {
          // If still within 15 min block-out period, deny send OTP request
          console.log('Login will be reset at:', JSON.stringify(resetTime));
          const updateResult = await update(userId, { status: 2 });
          console.log('Login is disabled for user account.', updateResult);
          return { allow: false, secondsRemaining };
        } else {
          const updateResult = await update(userId, { status: 1 });
          console.log('User account has been reset. Login enabled.', updateResult);
          return { allow: true };
        }
      }

      return { allow: true };
    } catch (error) {
      this.loggerWrapper(
        '[CIAM] checkOtpGenerationsWithoutSuccessfulLogin at PasswordlessSendCode Service - Failed',
        {
          layer: 'passwordlessSendCodeService.checkOtpGenerationsWithoutSuccessfulLogin',
          action: 'sendCode.checkOtpGenerationsWithoutSuccessfulLogin',
          error: new Error(error),
          userId,
        },
        'error',
      );
      throw error;
    }
  }

  async checkLoginDisabled(userData) {
    const { id, status } = userData;
    try {
      // If status !== 2, check how many OTP generations since last successful login
      if (status !== 2) {
        return { disabled: false };
      }

      // If status = 2 (login disabled), check if it is already 15 min past the last login event
      const lastLoginEvent = await UserCredentialEventsModel.getLastLoginEvent(id);
      const { resetTime, secondsRemaining } = await getResetTimeRemaining(lastLoginEvent);

      if (secondsRemaining > 0) {
        console.log('Login will be reset at:', JSON.stringify(resetTime));
        return { disabled: true, secondsRemaining };
      } else {
        const updateResult = await update(id, { status: 1 });
        console.log('User account has been reset. Login enabled.', updateResult);
        return { disabled: false };
      }
    } catch (error) {
      this.loggerWrapper(
        '[CIAM] checkLoginDisabled at PasswordlessSendCode Service - Failed',
        {
          layer: 'passwordlessSendCodeService.checkLoginDisabled',
          action: 'sendCode.checkLoginDisabled',
          error: new Error(error),
          userId: id,
        },
        'error',
      );
      throw error;
    }
  }

  async checkWithinCooldownInterval(userId, otpInterval) {
    try {
      // Check when the last 'send OTP' event was; if no such event, ok to generate OTP
      const lastSendOTPEvent = await UserCredentialEventsModel.getLastSendOTPEvent(userId);
      if (!lastSendOTPEvent) return { shouldGenerate: true, reason: null };

      const token = await tokenModel.getTokenById(lastSendOTPEvent.data.token_id);
      if (!token) throw new Error('Token does not exist in DB');

      const now = new Date();
      const tokenRequestedAt = new Date(token.created_at);
      const elapsedMs = now - tokenRequestedAt;
      const intervalMs = Number(otpInterval) * 1000;

      if (elapsedMs >= intervalMs) {
        await tokenModel.markTokenAsInvalid(lastSendOTPEvent.data.token_id); // Mark token as invalid because new token will be generated
        return { withinCooldown: false, remainingSeconds: 0 };
      }

      return { withinCooldown: true, remainingSeconds: Math.ceil((intervalMs - elapsedMs) / 1000) };
    } catch (error) {
      this.loggerWrapper(
        '[CIAM] checkWithinCooldownInterval at PasswordlessSendCode Service - Failed',
        {
          layer: 'passwordlessSendCodeService.checkWithinCooldownInterval',
          action: 'sendCode.checkWithinCooldownInterval',
          error,
        },
        'error',
      );
      throw error;
    }
  }

  async updateTokenSession(email, session) {
    try {
      const { id } = await findByEmail(email);
      const { data } = await UserCredentialEventsModel.getLastSendOTPEvent(id);
      const tokenId = data.token_id;
      await tokenModel.addSessionToToken(tokenId, session);
    } catch (error) {
      this.loggerWrapper(
        '[CIAM] updateTokenSession at PasswordlessSendCode Service - Failed',
        {
          layer: 'passwordlessSendCodeService.updateTokenSession',
          action: 'sendCode.updateTokenSession',
          error,
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
