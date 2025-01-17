const MembershipPassErrors = require("../../../config/https/errors/membershipPassErrors");
const { validateDOB } = require("../../../services/validationService");

class UserMembershipPassValidation {
  constructor() {
    this.error = null;
  }

  static validateCreateUserMembershipPass(req) {
    const requiredParams = [
      "email",
      "mandaiId",
      "group",
      "passType",
      "visualId",
      "categoryType",
      "adultQty",
      "childQty",
    ];

    const requestParams = Object.keys(req.body);
    const missingParams = requiredParams.filter(
      (param) => !requestParams.includes(param)
    );
    if (missingParams.length > 0) {
      return (this.error = MembershipPassErrors.membershipPassParamsError(
        missingParams[0],
        req.body.language
      ));
    }

    if (req.body.member?.dob) {
      const dob = validateDOB(req.member.dob);
      if (!dob) {
        return (this.error = MembershipPassErrors.membershipPassParamsError(
          "member_dob",
          req.body.language
        ));
      }
    }

    if (req.body.adultQty !== 1 && req.body.adultQty !== 2) {
      return (this.error = MembershipPassErrors.membershipPassParamsError(
        "adultQty",
        req.body.language
      ));
    }

    if (req.body.childQty < 0 || req.body.childQty > 2) {
      return (this.error = MembershipPassErrors.membershipPassParamsError(
        "childQty",
        req.body.language
      ));
    }

    if (!["yes", "no"].includes(req.body.parking)) {
      return (this.error = MembershipPassErrors.membershipPassParamsError(
        "parking",
        req.body.language
      ));
    }
  }

  static validateUpdateUserMembershipPass(req) {
    const requiredParams = ["visualId"];

    const requestParams = Object.keys(req.body);
    const missingParams = requiredParams.filter(
      (param) => !requestParams.includes(param)
    );
    if (missingParams.length > 0) {
      return (this.error = MembershipPassErrors.membershipPassParamsError(
        missingParams[0],
        req.body.language
      ));
    }

    if (req.body.member?.dob) {
      const dob = validateDOB(req.member.dob);
      if (!dob) {
        return (this.error = MembershipPassErrors.membershipPassParamsError(
          "member_dob",
          req.body.language
        ));
      }
    }

    if (
      req.body.adultQty &&
      req.body.adultQty !== 1 &&
      req.body.adultQty !== 2
    ) {
      return (this.error = MembershipPassErrors.membershipPassParamsError(
        "adultQty",
        req.body.language
      ));
    }

    if ((req.body.childQty && req.body.childQty < 0) || req.body.childQty > 2) {
      return (this.error = MembershipPassErrors.membershipPassParamsError(
        "childQty",
        req.body.language
      ));
    }

    if (req.body.parking && !["yes", "no"].includes(req.body.parking)) {
      return (this.error = MembershipPassErrors.membershipPassParamsError(
        "parking",
        req.body.language
      ));
    }
  }
}

module.exports = UserMembershipPassValidation;
