const CommonErrors = require('../../../config/https/errors/commonErrors');
const { passwordPattern } = require('../../../utils/common');
const { checkPasswordHasValidPattern } = require('../helpers/checkPasswordComplexityHelper');
const { switchIsTurnOn } = require('../../../helpers/dbSwitchesHelpers');
const UserPasswordVersionService = require('../userPasswordVersionService');

class UserConfirmResetPasswordValidation {
  constructor() {
    this.error = null;
  }

  static async execute(reqBody) {
    //validate missing required params
    const paramsShouldNotEmpty = ['newPassword', 'confirmPassword', 'passwordToken'];
    const listKeys = Object.keys(reqBody);

    const paramsMissing = paramsShouldNotEmpty.filter((key) => !listKeys.includes(key));
    if (paramsMissing.length) {
      return (this.error = CommonErrors.BadRequest(
        paramsMissing[0],
        `${paramsMissing[0]}_required`,
        reqBody.language,
      ));
    }

    //if parameters have some empty string
    const paramsInvalid = paramsShouldNotEmpty
      .filter((key) => listKeys.includes(key))
      .filter((ele) => reqBody[`${ele}`].trim() === '');

    if (paramsInvalid.length) {
      return (this.error = CommonErrors.BadRequest(
        paramsInvalid[0],
        `${paramsInvalid[0]}_invalid`,
        reqBody.language,
      ));
    }

    if (reqBody.newPassword) {
      const passwordCorrectFormat = await checkPasswordHasValidPattern(reqBody.newPassword);
      if (!passwordCorrectFormat) {
        return (this.error = CommonErrors.PasswordErr(reqBody.language));
      }
    }

    if (reqBody.newPassword !== reqBody.confirmPassword) {
      return (this.error = CommonErrors.PasswordNotMatch(reqBody.language));
    }

    return (this.error = null);
  }
}

module.exports = UserConfirmResetPasswordValidation;
