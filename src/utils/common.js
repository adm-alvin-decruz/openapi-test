const messages = require("../langs");
const userConfig = require("../config/usersConfig");
const dbConfig = require("../config/dbConfig");

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

module.exports = {
  messageLang,
  getSource,
  getGroup,
};
