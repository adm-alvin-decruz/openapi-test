const { switchIsTurnOn } = require("../../../helpers/dbSwitchesHelpers");
const {
  passwordPattern,
  passwordPatternComplexity,
} = require("../../../utils/common");

async function checkPasswordHasValidPattern(password) {
  const enableCheckingPasswordComplexity = await switchIsTurnOn("enable_check_password_complexity");
  console.log('3', enableCheckingPasswordComplexity)
  return enableCheckingPasswordComplexity
    ? passwordPatternComplexity(password)
    : passwordPattern(password);
}

module.exports = {
  checkPasswordHasValidPattern,
};
