const GROUP = {
  WILD_PASS: 'wildpass',
  MEMBERSHIP_PASSES: 'membership-passes',
};

const LANGUAGE_CODE = {
  JAPAN: 'ja',
  ENGLISH: 'en',
  KOREAN: 'kr',
  CHINA: 'zh',
};

const GROUPS_SUPPORTS = [GROUP.WILD_PASS, GROUP.MEMBERSHIP_PASSES];

const COGNITO_ATTRIBUTES = {
  firstName: 'given_name',
  lastName: 'family_name',
  email: 'email',
  newEmail: 'preferred_username',
  group: 'custom:membership',
  newsletter: 'custom:newsletter',
  source: 'custom:source',
  phoneNumber: 'phone_number',
  dob: 'birthdate',
  gender: 'gender',
  country: 'zoneinfo',
  address: 'address',
};

const EXPIRE_TIME_HOURS = 1; //hour unit

const EVENTS = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  PASSWORD_RESET: 'password_reset',
  PASSWORD_CHANGE: 'password_change',
  REFRESH_TOKEN: 'refresh_token',
  SEND_OTP: 'send_otp',
  VERIFY_OTP: 'verify_otp',
};

const STATUS = {
  FAILED: 0,
  SUCCESS: 1,
};

module.exports = {
  GROUP,
  LANGUAGE_CODE,
  GROUPS_SUPPORTS,
  COGNITO_ATTRIBUTES,
  EXPIRE_TIME_HOURS,
  EVENTS,
  STATUS,
};
