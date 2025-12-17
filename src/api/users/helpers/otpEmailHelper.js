const userConfig = require('../../../config/usersConfig');
const { formatDateToMySQLDateTime } = require('../../../utils/dateUtils');
const CommonErrors = require('../../../config/https/errors/commonErrors');

/**
 * Validates otpEmailDisabledUntil value
 * Only accepts: true, false, 'true', 'false'
 * 
 * @param {*} value - The value to validate
 * @param {string} language - Language for error messages
 * @returns {Object|null} - Error object if invalid, null if valid
 */
function validateOtpEmailDisabledUntil(value, language = 'en') {
  if (value === undefined) {
    return null; // undefined is valid (no change)
  }

  const allowedValues = [true, false, 'true', 'false'];
  if (!allowedValues.includes(value)) {
    return CommonErrors.BadRequest(
      'otpEmailDisabledUntil',
      'otpEmailDisabledUntil_invalid',
      language,
    );
  }

  return null; // Valid
}

/**
 * Transforms otpEmailDisabledUntil value to MySQL datetime format
 * - true/'true' → datetime string (current time + duration)
 * - false/'false' → null (clear disable window)
 * - undefined → undefined (no change)
 * - datetime string (already transformed) → return as-is
 * 
 * @param {*} value - The value to transform (must be validated first)
 * @returns {string|null|undefined} - Transformed value
 */
function transformOtpEmailDisabledUntil(value) {
  if (value === undefined) {
    return undefined; // No change
  }

  // If already a datetime string, validate it's a valid date and return as-is
  // This handles cases where value was already transformed in route
  // Use Date parsing instead of brittle regex to be more robust
  if (typeof value === 'string') {
    const parsedDate = new Date(value);
    // Check if it's a valid date and matches MySQL datetime format (YYYY-MM-DD HH:mm:ss)
    if (!isNaN(parsedDate.getTime()) && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
      return value;
    }
  }

  if (value === 'true' || value === true) {
    const date = new Date(Date.now() + userConfig.OTP_EMAIL_DISABLED_UNTIL_DURATION);
    return formatDateToMySQLDateTime(date);
  }

  // For false or 'false', return null to clear the disable window
  return null;
}

/**
 * Validates and transforms otpEmailDisabledUntil in one step
 * 
 * @param {*} value - The value to validate and transform
 * @param {string} language - Language for error messages
 * @returns {Object} - { error: Error|null, value: string|null|undefined }
 */
function validateAndTransformOtpEmailDisabledUntil(value, language = 'en') {
  const error = validateOtpEmailDisabledUntil(value, language);
  if (error) {
    return { error, value: undefined };
  }

  const transformedValue = transformOtpEmailDisabledUntil(value);
  return { error: null, value: transformedValue };
}

module.exports = {
  validateOtpEmailDisabledUntil,
  transformOtpEmailDisabledUntil,
  validateAndTransformOtpEmailDisabledUntil,
};

