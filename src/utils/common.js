require("dotenv").config();
const messages = require("../langs");
const userConfig = require("../config/usersConfig");
const dbConfig = require("../config/dbConfig");
const crypto = require("crypto");

const messageLang = (key, lang) => {
  const language = messages[lang] || messages["en"];
  return language[key];
};

const getSource = (appId) => {
  const sourceMap = JSON.parse(userConfig.SOURCE_MAPPING);
  const dbSourceMapping = JSON.parse(dbConfig.SOURCE_DB_MAPPING);
  const sourceMappings = {
    ORGANIC: "GA",
    TICKETING: "TK",
    GLOBALTIX: "BX",
  };
  const source = sourceMap[appId] || "ORGANIC";

  return {
    source,
    sourceDB: dbSourceMapping[source] ?? "",
    sourceKey: sourceMappings[source] ?? "",
  };
};

const getGroup = (group) => {
  const groupMappings = {
    wildpass: "WP",
    'membership-passes': "MP"
  };

  return groupMappings[group] ?? "";
};

const passwordPattern = (password) => {
  const regexPasswordValid = new RegExp(
    '^(?=.*[a-z])(?=.*[A-Z]).{8,}$',
    "g"
  );
  return regexPasswordValid.test(password.toString());
};

const generateSecretHash = (keyword) => {
  const clientId = process.env.USER_POOL_CLIENT_ID;
  const clientSecret = process.env.USER_POOL_CLIENT_SECRET;
  return crypto
    .createHmac("sha256", clientSecret)
    .update(`${keyword}${clientId}`)
    .digest("base64");
};

//create random token key
const generateRandomToken = (size) => {
  return crypto.randomBytes(size).toString("hex");
};

const generateSaltHash = (keyword, saltKey, hashAlgorithm = "sha256") => {
  const data = Buffer.from(`${keyword}${saltKey}`.trim(), "utf8");
  return crypto.createHash(hashAlgorithm).update(data).digest("base64");
};

module.exports = {
  messageLang,
  getSource,
  getGroup,
  passwordPattern,
  generateSecretHash,
  generateRandomToken,
  generateSaltHash,
};
