const { validateDOB } = require("../../../services/validationService");
const CommonErrors = require("../../../config/https/errors/commonErrors");
const { passwordPattern } = require("../../../utils/common");
const emailDomainService = require("../../../services/emailDomainsService");
const userCredentialModel = require("../../../db/models/userCredentialModel");
const passwordService = require("../userPasswordService");
const argon2 = require("argon2");
const { checkPasswordHasValidPattern } = require("../helpers/checkPasswordComplexityHelper");

class UserUpdateValidation {
  constructor() {
    this.error = null;
  }

  static execute(req) {
    return this.validateRequestParams(req);
  }

  //return true/false
  static async verifyPassword(email, password) {
    const userCredential = await userCredentialModel.findByUserEmail(email);
    //check by password salt - from migration always have salt
    if (userCredential && userCredential.salt) {
      return passwordService
          .createPassword(password, userCredential.salt)
          .toUpperCase() === userCredential.password_hash.toUpperCase()
    }
    //check by password argon2 with normal flow
    return await argon2.verify(userCredential.password_hash, password);
  }

  //enhance get list error
  static async validateRequestParams(req) {
    const privateMode = !!req.privateMode;

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
    if (bodyData.newPassword || bodyData.confirmPassword || bodyData.oldPassword) {
      if (!bodyData.oldPassword && !privateMode) {
        return (this.error = CommonErrors.BadRequest(
          "oldPassword",
          "oldPassword_required",
          req.language
        ));
      }

      if (!bodyData.newPassword) {
        return (this.error = CommonErrors.BadRequest(
          "newPassword",
          "newPassword_required",
          req.language
        ));
      }

      if (!bodyData.confirmPassword && !privateMode) {
        return (this.error = CommonErrors.BadRequest(
          "confirmPassword",
          "confirmPassword_required",
          req.language
        ));
      }

      const passwordCorrectFormat = await checkPasswordHasValidPattern(bodyData.newPassword);
      if (!passwordCorrectFormat) {
        return (this.error = CommonErrors.PasswordErr(req.language));
      }

      if (bodyData.newPassword !== bodyData.confirmPassword) {
        return (this.error = CommonErrors.PasswordNotMatch(req.language));
      }

      //verify old password is not match
      let oldPasswordIsSame = false;
      if (bodyData.oldPassword) {
        oldPasswordIsSame = await this.verifyPassword(req.email, bodyData.oldPassword)
      }
      if (!oldPasswordIsSame) {
        return (this.error = CommonErrors.OldPasswordNotMatchErr(req.language));
      }

      //verify new password is same with old password
      if (bodyData.oldPassword && bodyData.oldPassword === bodyData.newPassword) {
        return (this.error = CommonErrors.sameOldPasswordException(req.language));
      }
    }
    return (this.error = null);
  }
}

module.exports = UserUpdateValidation;
