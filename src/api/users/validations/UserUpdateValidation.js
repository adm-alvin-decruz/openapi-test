const { validateDOB } = require("../../../services/validationService");
const CommonErrors = require("../../../config/https/errors/common");
const { passwordPattern } = require("../../../utils/common");
const emailDomainService = require("../../../services/emailDomainsService");

class UserUpdateValidation {
  constructor() {
    this.error = null;
  }

  //enhance get list error
  static async validateRequestParams(req) {
    if ((req.data && Object.keys(req.data).length === 0) || !req.data) {
      return (this.error = CommonErrors.RequestIsEmptyErr(req.language));
    }
    const bodyData = req.data;

    //validate missing required params
    const paramsShouldNotEmpty = [
      "newEmail",
      "firstName",
      "lastName",
      "country",
      // "phoneNumber", //disabled for now
      "newPassword",
      "confirmPassword",
      "oldPassword",
      "address",
    ];
    const listKeys = Object.keys(bodyData);
    //if parameters have some empty string
    const paramsInvalid = paramsShouldNotEmpty
      .filter((key) => listKeys.includes(key))
      .filter((ele) => bodyData[`${ele}`].trim() === "");

    if (paramsInvalid.length) {
      return (this.error = CommonErrors.BadRequest(
        paramsInvalid[0],
        `${paramsInvalid[0]}_invalid`,
        req.language
      ));
    }

    if (bodyData.newEmail && !emailDomainService.isValidEmailFormat(bodyData.newEmail)) {
      return (this.error = CommonErrors.BadRequest(
        "newEmail",
        "newEmail_invalid",
        req.language
      ));
    }

    // check email domain switch turned on ( 1 ) if email format is passed
    if (bodyData.newEmail && emailDomainService.isValidEmailFormat(bodyData.newEmail)) {
      if ((await emailDomainService.getCheckDomainSwitch()) === true) {
        // validate email domain to DB
        let validDomain = await emailDomainService.validateEmailDomain(bodyData.newEmail);
        if (!validDomain) {
          return (this.error = CommonErrors.BadRequest(
              "newEmail",
              "newEmail_invalid",
              req.language
          ));
        }
      }
    }


    if (bodyData.dob || bodyData.dob === "") {
      const dob = validateDOB(bodyData.dob);
      if (!dob) {
        return (this.error = CommonErrors.BadRequest(
          "dob",
          "dob_invalid",
          req.language
        ));
      }
    }
    if (bodyData.country && bodyData.country.length !== 2) {
      return (this.error = CommonErrors.BadRequest(
        "country",
        "country_invalid",
        req.language
      ));
    }
    if (
      bodyData.newsletter &&
      bodyData.newsletter.name &&
      !["wildpass", "membership"].includes(bodyData.newsletter.name)
    ) {
      return (this.error = CommonErrors.BadRequest(
        "newsletter",
        "newsletter_invalid",
        req.language
      ));
    }
    if (bodyData.newPassword) {
      if (!bodyData.oldPassword) {
        return (this.error = CommonErrors.OldPasswordNotMatchErr(req.language));
      }
      if (!passwordPattern(bodyData.newPassword)) {
        return (this.error = CommonErrors.PasswordErr(req.language));
      }
      if (bodyData.newPassword !== bodyData.confirmPassword) {
        return (this.error = CommonErrors.PasswordNotMatch(req.language));
      }
    }
    return (this.error = null);
  }

  static execute(req) {
    return this.validateRequestParams(req);
  }
}

module.exports = UserUpdateValidation;
