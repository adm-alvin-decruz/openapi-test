const { validateDOB } = require("../../../services/validationService");
const { passwordPattern } = require("../../../utils/common");
const CommonErrors = require("../../../config/https/errors/commonErrors");
const commonService = require("../../../services/commonService");

class UserSignupValidation {
  constructor() {
    this.error = null;
  }

  static execute(req) {
    return this.validateRequestMembershipPasses(req);
  }

  static validateRequestMembershipPasses(req) {
    let reqBody = req.body;
    //validate missing required params
    const requireParams = !!reqBody.migrations
      ? ["email", "firstName", "lastName"]
      : ["email", "firstName", "lastName", "password", "confirmPassword"];
    const listKeys = Object.keys(reqBody);
    const paramsMissing = requireParams.filter(
      (key) => !listKeys.includes(key)
    );
    if (paramsMissing.length) {
      return (this.error = CommonErrors.BadRequest(
        paramsMissing[0],
        `${paramsMissing[0]}_invalid`,
        reqBody.language
      ));
    }
    const paramsShouldNotEmpty = !!reqBody.migrations
      ? ["email", "firstName", "lastName"]
      : [
          "email",
          "firstName",
          "lastName",
          "country",
          // "phoneNumber", // disabled for now, onsite signup may have many rubbish phone number
          "password",
          "confirmPassword",
        ];
    //if parameters have some empty string
    const paramsInvalid = paramsShouldNotEmpty
      .filter((key) => listKeys.includes(key))
      .filter((ele) => reqBody[`${ele}`].trim() === "");

    if (paramsInvalid.length) {
      return (this.error = CommonErrors.BadRequest(
        paramsInvalid[0],
        `${paramsInvalid[0]}_invalid`,
        reqBody.language
      ));
    }

    const requestFromAEM = commonService.isRequestFromAEM(req.headers);
    if (reqBody.dob && requestFromAEM) {
      if (reqBody.dob || reqBody.dob === "") {
        const dob = validateDOB(reqBody.dob);
        if (!dob) {
          return (this.error = CommonErrors.BadRequest(
            "dob",
            "dob_invalid",
            reqBody.language
          ));
        }
      }
    }

    if (reqBody.country && reqBody.country.length !== 2) {
      return (this.error = CommonErrors.BadRequest(
        "country",
        "country_invalid",
        reqBody.language
      ));
    }

    if (reqBody.password) {
      if (!passwordPattern(reqBody.password)) {
        return (this.error = CommonErrors.PasswordErr(reqBody.language));
      }
      if (reqBody.password !== reqBody.confirmPassword) {
        return (this.error = CommonErrors.PasswordNotMatch(reqBody.language));
      }
    }

    return (this.error = null);
  }
}

module.exports = UserSignupValidation;
