const GROUP = {
  WILD_PASS: "wildpass",
  FOW: "fow",
  FOW_PLUS: "fow+",
};

const LANGUAGE_CODE = {
  JAPAN: "ja",
  ENGLISH: "en",
  KOREAN: "kr",
  CHINA: "zh",
};

const GROUPS_SUPPORTS = [GROUP.WILD_PASS, GROUP.FOW, GROUP.FOW_PLUS];

const COGNITO_ATTRIBUTES = {
  firstName: "given_name",
  lastName: "family_name",
  email: "preferred_username",
  group: "custom:membership",
  newsletter: "custom:newsletter",
  source: "custom:source",
  phoneNumber: "phone_number",
  dob: "birthdate",
  gender: "gender",
};

const EXPIRE_TIME_HOURS = 1; //hour unit

module.exports = {
  GROUP,
  LANGUAGE_CODE,
  GROUPS_SUPPORTS,
  COGNITO_ATTRIBUTES,
  EXPIRE_TIME_HOURS
};
