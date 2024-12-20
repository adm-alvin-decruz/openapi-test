const SignupErrors = require("../../../config/https/errors/signupErrors");
const { validateDOB } = require("../../../services/validationService");
const { GROUPS_SUPPORTS, GROUP } = require("../../../utils/constants");

class UserSignupValidation {
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
    const requireParams = [
      "email",
      "firstName",
      "lastName",
      "country",
      "phoneNumber",
      "password",
      "confirmPassword",
    ];
    const listKeys = Object.keys(req);
    const paramsMissing = requireParams.filter(
      (key) => !listKeys.includes(key)
    );
    if (paramsMissing.length) {
      return (this.error = SignupErrors.ciamWrongParams(
        paramsMissing[0],
        req.language
      ));
    }

    if (req.dob || req.dob === "") {
      const dob = validateDOB(req.dob);
      if (!dob) {
        return (this.error = SignupErrors.ciamWrongParams("dob", req.language));
      }
    }

    if (req.country.length !== 2) {
      return (this.error = SignupErrors.ciamWrongParams(
        "country",
        req.language
      ));
    }

    const regexPasswordValid = new RegExp(
      '^(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>])(?=.*[A-Z])(?=.*[a-z]).{8,}$',
      "g"
    );
    if (!regexPasswordValid.test(req.password.toString())) {
      return (this.error = SignupErrors.ciamPasswordErr(req.language));
    }

    if (req.password !== req.confirmPassword) {
      return (this.error = SignupErrors.ciamPasswordNotMatch(req.language));
    }

    return (this.error = null);
  }

  static execute(data) {
    if (!data.group || !GROUPS_SUPPORTS.includes(data.group)) {
      return (this.error = SignupErrors.ciamWrongParams(
        "group",
        data.language
      ));
    }
    if (data.group === GROUP.WILD_PASS) {
      return this.validateRequestWildPass(data);
    }

    return this.validateRequestFowFowPlus(data);
  }
}

module.exports = UserSignupValidation;
