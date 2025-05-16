const switchService = require("../services/switchService");

/**
 * Should Check Switch is turn on
 * @async
 * @param {string} key - key matching in name column in switch DB
 * @returns {Promise<boolean>} - Check is Switch Key is turn on
 */
async function switchIsTurnOn(key) {
  const switchConfig = await switchService.findByName(key);
  return switchConfig && switchConfig.switch === 1;
}

module.exports = {
  switchIsTurnOn,
};
