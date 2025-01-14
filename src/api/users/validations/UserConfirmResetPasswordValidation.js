const CommonErrors = require("../../../config/https/errors/common");
const { passwordPattern } = require("../../../utils/common");

class UserConfirmResetPasswordValidation {
  constructor() {
    this.error = null;
  }

  static execute(data) {
    //validate missing required params
    const paramsShouldNotEmpty = [
      "newPassword",
      "confirmPassword",
      "passwordToken",
    ];
    const listKeys = Object.keys(data);

    const paramsMissing = paramsShouldNotEmpty.filter(
      (key) => !listKeys.includes(key)
    );
    if (paramsMissing.length) {
      return (this.error = CommonErrors.BadRequest(
        paramsMissing[0],
        `${paramsMissing[0]}_required`,
        data.language
      ));
    }

    //if parameters have some empty string
    const paramsInvalid = paramsShouldNotEmpty
      .filter((key) => listKeys.includes(key))
      .filter((ele) => data[`${ele}`].trim() === "");

    if (paramsInvalid.length) {
      return (this.error = CommonErrors.BadRequest(
        paramsInvalid[0],
        `${paramsInvalid[0]}_invalid`,
        data.language
      ));
    }

    if (data.newPassword && !passwordPattern(data.newPassword)) {
      return (this.error = CommonErrors.PasswordErr(data.language));
    }

    if (data.newPassword !== data.confirmPassword) {
      return (this.error = CommonErrors.PasswordNotMatch(data.language));
    }

    return (this.error = null);
  }
}

module.exports = UserConfirmResetPasswordValidation;
