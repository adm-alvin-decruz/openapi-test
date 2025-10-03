const PasswordlessSendCodeService = require('./passwordlessSendCodeServices');
const tokenModel = require('../../../../db/models/passwordlessTokenModel');
const PasswordlessVerifyCodeService = require('./passwordlessVerifyCodeServices');

/**
 * Define step before verify.
 * Decide whether to issue a challenge.
 */
async function defineForVerify(req) {
  const { email } = req.body || {};

  const isMagicLink = !!req.query?.token?.trim();
  if (isMagicLink) {
    const decryptedToken = await PasswordlessVerifyCodeService.decryptMagicToken(req);
    req.body.email = decryptedToken.email;
    req.body.code = decryptedToken.otp;
  }

  // Check for max attempt for last retrieved token
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

  const tooMany = token.attempt >= MAX_ATTEMPTS;
  if (tooMany) {
    return { proceed: false, reason: 'rate_limit' };
  }

  return { proceed: true, tokenId: token.id };
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
  defineForVerify,
  mapDefineReasonToHelperKey,
};
