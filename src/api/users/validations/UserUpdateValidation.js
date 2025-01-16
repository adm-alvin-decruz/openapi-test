const { validateDOB } = require("../../../services/validationService");
const CommonErrors = require("../../../config/https/errors/common");
const { passwordPattern } = require("../../../utils/common");

class UserUpdateValidation {
  constructor() {
    this.error = null;
  }

  //enhance get list error
  static validateRequestParams(req) {
    //validate missing required params
    const paramsShouldNotEmpty = [
      "newEmail",
      "firstName",
      "lastName",
      "country",
      "phoneNumber",
      "newPassword",
      "confirmPassword",
      "oldPassword",
      "address",
    ];
    const listKeys = Object.keys(req);

    //if parameters have some empty string
    const paramsInvalid = paramsShouldNotEmpty
      .filter((key) => listKeys.includes(key))
      .filter((ele) => req[`${ele}`].trim() === "");

    if (paramsInvalid.length) {
      return (this.error = CommonErrors.BadRequest(
        paramsInvalid[0],
        `${paramsInvalid[0]}_invalid`,
        req.language
      ));
    }

    if (req.dob || req.dob === "") {
      const dob = validateDOB(req.dob);
      if (!dob) {
        return (this.error = CommonErrors.BadRequest(
          "dob",
          "dob_invalid",
          req.language
        ));
      }
    }
    if (req.country && req.country.length !== 2) {
      return (this.error = CommonErrors.BadRequest(
        "country",
        "country_invalid",
        req.language
      ));
    }
    if (
      req.newsletter &&
      req.newsletter.name &&
      !["wildpass", "membership"].includes(req.newsletter.name)
    ) {
      return (this.error = CommonErrors.BadRequest(
        "newsletter",
        "newsletter_invalid",
        req.language
      ));
    }
    if (req.newPassword) {
      if (!req.oldPassword) {
        return (this.error = CommonErrors.OldPasswordNotMatchErr(req.language));
      }
      if (!passwordPattern(req.newPassword)) {
        return (this.error = CommonErrors.PasswordErr(req.language));
      }
      if (req.newPassword !== req.confirmPassword) {
        return (this.error = CommonErrors.PasswordNotMatch(req.language));
      }
    }
    return (this.error = null);
  }

  static execute(data) {
    return this.validateRequestParams(data);
  }
}

module.exports = UserUpdateValidation;
