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
    fow: "FW",
    "fow+": "FWP",
  };

  return groupMappings[group] ?? "";
};

const passwordPattern = (password) => {
  const regexPasswordValid = new RegExp(
    '^(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>])(?=.*[A-Z])(?=.*[a-z]).{8,}$',
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

module.exports = {
  messageLang,
  getSource,
  getGroup,
  passwordPattern,
  generateSecretHash
};
