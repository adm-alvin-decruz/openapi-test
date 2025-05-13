const { switchIsTurnOn } = require("../../../helpers/dbSwitchesHelpers");
const {
  passwordPattern,
  passwordPatternComplexity,
} = require("../../../utils/common");

async function checkPasswordHasValidPattern(password) {
  const enableCheckingPasswordComplexity = await switchIsTurnOn("enable_check_password_complexity");
  return enableCheckingPasswordComplexity
    ? passwordPatternComplexity(password)
    : passwordPattern(password);
}

module.exports = {
  checkPasswordHasValidPattern,
};
