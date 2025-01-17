const SignupErrors = require("../../../config/https/errors/signupErrors");
const { validateDOB } = require("../../../services/validationService");
const { passwordPattern } = require("../../../utils/common");
const CommonErrors = require("../../../config/https/errors/common");

class UserSignupValidation {
  constructor() {
    this.error = null;
  }

  static validateRequestMembershipPasses(req) {
    //validate missing required params
    const requireParams = [
      "email",
      "firstName",
      "lastName",
      "password",
      "confirmPassword",
    ];
    const listKeys = Object.keys(req);
    const paramsMissing = requireParams.filter(
      (key) => !listKeys.includes(key)
    );
    if (paramsMissing.length) {
      return (this.error = CommonErrors.BadRequest(
        paramsMissing[0],
        `${paramsMissing[0]}_invalid`,
        req.language
      ));
    }

    const paramsShouldNotEmpty = [
      "email",
      "firstName",
      "lastName",
      "country",
      "phoneNumber",
      "password",
      "confirmPassword",
    ];
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

    if (req.country.length !== 2) {
      return (this.error = CommonErrors.BadRequest(
        "country",
        "country_invalid",
        req.language
      ));
    }

    if (req.password) {
      if (!passwordPattern(req.password)) {
        return (this.error = CommonErrors.PasswordErr(req.language));
      }
      if (req.password !== req.confirmPassword) {
        return (this.error = CommonErrors.PasswordNotMatch(req.language));
      }
    }

    return (this.error = null);
  }

  static execute(data) {
    return this.validateRequestMembershipPasses(data);
  }
}

module.exports = UserSignupValidation;
