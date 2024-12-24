const { validateDOB } = require("../../../services/validationService");
const {
  GROUPS_SUPPORTS,
  GROUP,
} = require("../../../utils/constants");
const CommonErrors = require("../../../config/https/errors/common");
const SignupErrors = require("../../../config/https/errors/signupErrors");
const { passwordPattern } = require("../../../utils/common");

class UserUpdateValidation {
  constructor() {
    this.error = null;
  }

  /*TODO
   *  moving validation wildpass after agreement!
   * */
  static validateRequestWildPass(req) {
    return (this.error = null);
  }

  //enhance get list error
  static validateRequestFowFowPlus(req) {
    //validate missing required params
    const paramsShouldNotEmpty = [
      "firstName",
      "lastName",
      "country",
      "phoneNumber",
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

    if (req.country.length !== 2) {
      return (this.error = CommonErrors.BadRequest(
        "country",
        "country_invalid",
        req.language
      ));
    }

    if (
      req.newsletter &&
      (!req.newsletter.subscribe ||
        !GROUPS_SUPPORTS.includes(req.newsletter.name))
    ) {
      return (this.error = CommonErrors.BadRequest(
        "newsletter",
        "newsletter_invalid",
        req.language
      ));
    }

    if (req.password) {
      if (!req.oldPassword) {
        return (this.error = CommonErrors.PasswordRequireErr(req.language));
      }
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
    if (!data.group || !GROUPS_SUPPORTS.includes(data.group)) {
      return (this.error = CommonErrors.BadRequest(
        "group",
        "group_invalid",
        data.language
      ));
    }
    if (data.group === GROUP.WILD_PASS) {
      return this.validateRequestWildPass(data);
    }

    return this.validateRequestFowFowPlus(data);
  }
}

module.exports = UserUpdateValidation;
