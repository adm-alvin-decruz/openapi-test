const PasswordlessSendCodeService = require('./passwordlessSendCodeServices');
const { switchIsTurnOn } = require('../../../../helpers/dbSwitchesHelpers');
const tokenModel = require('../../../../db/models/passwordlessTokenModel');
const PasswordlessVerifyCodeService = require('./passwordlessVerifyCodeServices');

/**
 * Define step before create.
 * Decide whether to issue a challenge.
 */
async function shouldIssueChallenge(req) {
  const { email, purpose = 'login' } = req.body || {};

  //check flag for send otp and email
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

  //Cooldown check early from generateCode
  const OTP_INTERVAL = await PasswordlessSendCodeService.getValueByConfigValueName(
    'passwordless-otp',
    'otp-config',
    'otp_interval',
  );
  const allowed = await PasswordlessSendCodeService.shouldGenerateNewToken(email, OTP_INTERVAL);

  if (!allowed) {
    return {
      proceed: false,
      reason: 'too_soon',
    };
  }

  return { proceed: true, purpose };
}

//Define step before verify
async function defineForVerify(req) {
  const { email } = req.body || {};

  const isMagicLink = !!req.query?.token?.trim();
  if (isMagicLink) {
    const decryptedToken = await PasswordlessVerifyCodeService.decryptMagicToken(req);
    req.body.email = decryptedToken.email;
    req.body.code = decryptedToken.otp;
  }

  //pre-check against latest token if the challenge still valid
  const MAX_ATTEMPTS = await PasswordlessSendCodeService.getValueByConfigValueName(
    'passwordless-otp',
    'otp-config',
    'otp_max_attempt',
  );
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

  const tooMany = (token.attempt || 0) > MAX_ATTEMPTS;
  if (tooMany) {
    return { proceed: false, reason: 'rate_limit' };
  }

  return { proceed: true, tokenId: token.id };
}

function mapDefineCreateReasonToHelperKey(reason) {
  return (
    {
      missing_email: 'invalid',
      too_soon: 'tooSoon',
      send_disabled_login: 'notSupported',
      send_disabled_signup: 'notSupported',
    }[reason] || 'invalid'
  );
}

function mapDefineReasonToHelperKey(reason) {
  // defineForVerify reasons
  const map = {
    missing_email: 'invalid',
    not_found: 'notFound',
    used: 'used',
    expired: 'expired',
    rate_limit: 'rateLimit',
  };
  return map[reason] || 'notFound';
}

module.exports = {
  shouldIssueChallenge,
  defineForVerify,
  mapDefineCreateReasonToHelperKey,
  mapDefineReasonToHelperKey,
};
