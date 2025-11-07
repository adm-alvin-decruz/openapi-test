require('dotenv').config();
const messages = require('../langs');
const userConfig = require('../config/usersConfig');
const dbConfig = require('../config/dbConfig');
const crypto = require('crypto');
const { secrets } = require('../services/secretsService');

const messageLang = (key, lang) => {
  const language = messages[lang] || messages['en'];
  return language[key];
};

const getSource = (appId) => {
  const sourceMap = JSON.parse(userConfig.SOURCE_MAPPING);
  const dbSourceMapping = JSON.parse(dbConfig.SOURCE_DB_MAPPING);
  const sourceMappings = {
    ORGANIC: 'GA',
    TICKETING: 'TK',
    GLOBALTIX: 'BX',
  };
  const source = sourceMap[appId] || 'ORGANIC';

  return {
    source,
    sourceDB: dbSourceMapping[source] ?? '',
    sourceKey: sourceMappings[source] ?? '',
  };
};

const getGroup = (group) => {
  const groupMappings = {
    wildpass: 'WP',
    'membership-passes': 'MP',
  };

  return groupMappings[group] ?? '';
};

const passwordPattern = (password) => {
  const regexPasswordValid = new RegExp('^(?=.*[a-z])(?=.*[A-Z]).{8,}$', 'g');
  return regexPasswordValid.test(password.toString());
};

const passwordPatternComplexity = (password) => {
  const regexPasswordValid = new RegExp(
    '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\$%^&*_+=\\[\\]<>]).{10,}$',
    'g',
  );
  return regexPasswordValid.test(password.toString());
};

const emailPattern = (email) => {
  const regexEmailValid = new RegExp(
    '^(?=.{1,64}@)[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,63}$',
    'g',
  );
  return regexEmailValid.test(email.toString());
};

const generateSecretHash = async (keyword) => {
  try {
    const ciamSecrets = await secrets.getSecrets('ciam-microservice-lambda-config');
    const clientId = ciamSecrets.USER_POOL_CLIENT_ID;
    const clientSecret = ciamSecrets.USER_POOL_CLIENT_SECRET;
    return crypto
      .createHmac('sha256', clientSecret)
      .update(`${keyword}${clientId}`)
      .digest('base64');
  } catch (error) {
    throw new Error('generateSecretHash error: ', error);
  }
};

//create random token key
const generateRandomToken = (size) => {
  return crypto.randomBytes(size).toString('hex');
};

const generateSaltHash = (keyword, saltKey, hashAlgorithm = 'sha256') => {
  const data = Buffer.from(`${keyword}${saltKey}`.trim(), 'utf8');
  return crypto.createHash(hashAlgorithm).update(data).digest('base64');
};

const formatPhoneNumber = (phoneNumber) => {
  return phoneNumber.trim().split(' ').join('');
};

const omit = (obj, excludeKeys) => {
  return Object.fromEntries(Object.entries(obj).filter((e) => !excludeKeys.includes(e[0])));
};

const maskKeyRandomly = (str) => {
  // Handle empty strings or null/undefined
  if (!str) {
    return '';
  }

  // If string is too short (less than 11 characters), we can't show 3+5+3 pattern properly
  if (str.length <= 10) {
    // For very short strings, show at least first and last character if possible
    if (str.length === 1) {
      return str;
    } else if (str.length === 2) {
      // For 2-character strings, show first character and mask the second , example "AB" -> "A*"
      return str[0] + '*';
    } else if (str.length <= 6) {
      return str[0] + '*'.repeat(str.length - 2) + str[str.length - 1];
    } else {
      // For strings between 7-10 chars, show 2 chars at beginning and end with asterisks in middle
      return str.substring(0, 2) + '*'.repeat(3) + str.substring(str.length - 2);
    }
  }

  // For normal length strings, show first 3, middle 5 asterisks, and last 3
  const firstPart = str.substring(0, 3);
  const lastPart = str.substring(str.length - 3);

  return firstPart + '*****' + lastPart;
};

const existsCapitalizePattern = (keyword) => {
  const regexEmailValid = new RegExp('\\b\\w*[A-Z]\\w*\\b', 'g');
  return regexEmailValid.test(keyword.toString());
};

// Generate random 5-character string (letters + numbers)
const generateRandomString = () => {
  return crypto.randomUUID().replace(/-/g, '');
};

const randomizeDeletedEmail = (email) => {
  if (!email || !email.includes('@')) {
    throw new Error('Invalid email format');
  }

  const [localPart, domain] = email.split('@');

  // Generate UUID without hyphens (32 hex chars)
  const uuid = generateRandomString();

  // Format: delete-<localPart>~<uuid>
  // Need: localPart + uuid + overhead ≤ 64
  // Overhead: "delete-" (7) + "~" (1) = 8 chars
  const overhead = 8;
  const availableForUuid = 64 - overhead - localPart.length;
  // Minimum 8 chars for uuid for safety to avoid duplicate 1 out of 2^32
  if (availableForUuid <= 8) {
    throw new Error('Unable to construct valid deleted email local part');
  }

  const finalUuid = uuid.substring(0, Math.min(uuid.length, availableForUuid));

  return `delete-${localPart}~${finalUuid}@${domain}`;
};

module.exports = {
  messageLang,
  getSource,
  getGroup,
  passwordPattern,
  generateSecretHash,
  generateRandomToken,
  generateSaltHash,
  formatPhoneNumber,
  omit,
  maskKeyRandomly,
  emailPattern,
  existsCapitalizePattern,
  passwordPatternComplexity,
  randomizeDeletedEmail,
};
