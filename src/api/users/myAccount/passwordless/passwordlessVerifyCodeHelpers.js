const PasswordlessErrors = require('../../../../config/https/errors/passwordlessErrors');

function getTokenError(type, req, isMagicLink) {
  const email = req.body?.email || req.query?.email || '';
  const lang = req.body?.language || req.query?.language || 'en';

  if (type === 'expired') {
    return isMagicLink
      ? PasswordlessErrors.verifyMagicLinkError(lang)
      : PasswordlessErrors.expiredError(email, lang);
  }
  if (type === 'rateLimit') {
    return PasswordlessErrors.verifyRateLimitError(email, lang);
  }

  if (type === 'missingToken') {
    return PasswordlessErrors.tokenMissingError(lang);
  }
  // default ("invalid", "used", "notFound", "empty")
  return isMagicLink
    ? PasswordlessErrors.verifyMagicLinkError(lang)
    : PasswordlessErrors.verifyOtpError(email, lang);
}

module.exports = {
  getTokenError,
};
