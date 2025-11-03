const { switchIsTurnOn } = require('../../../helpers/dbSwitchesHelpers');
const { passwordPattern, passwordPatternComplexity } = require('../../../utils/common');

async function checkPasswordHasValidPattern(password, flag) {
  const enableCheckingPasswordComplexity = await switchIsTurnOn(flag);
  return enableCheckingPasswordComplexity
    ? passwordPatternComplexity(password)
    : passwordPattern(password);
}

module.exports = {
  checkPasswordHasValidPattern,
};
