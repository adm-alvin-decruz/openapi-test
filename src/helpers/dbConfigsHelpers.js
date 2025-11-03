const configsModel = require('../db/models/configsModel');

async function getPassType(data) {
  const passTypeMapping =
    data.migrations &&
    (await configsModel.findByConfigKey('membership-passes', 'pass-type-mapping'));

  return !!passTypeMapping && passTypeMapping.value
    ? passTypeMapping.value[`${data.passType.toLowerCase()}`]
    : data.passType.toLowerCase();
}

module.exports = {
  getPassType,
};
