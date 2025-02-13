const MembershipPassErrors = require("../../../config/https/errors/membershipPassErrors");
const { validateDOBiso } = require("../../../services/validationService");

class UserMembershipPassValidation {
  constructor() {
    this.error = null;
  }

  static validateCreateUserMembershipPass(req) {
    const requiredParams = req.body && req.body.migrations
      ? [
          "email",
          "group",
          "passType",
          "visualId",
          "categoryType",
          "adultQty",
          "childQty",
        ]
      : [
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
      const dob = validateDOBiso(req.body.member.dob);
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

    if (req.body.parking && !["yes", "no"].includes(req.body.parking)) {
      return (this.error = MembershipPassErrors.membershipPassParamsError(
        "parking",
        req.body.language
      ));
    }

    if (
      req.body.member &&
      (typeof req.body.member !== "object" || Array.isArray(req.body.member))
    ) {
      return (this.error = MembershipPassErrors.membershipPassParamsError(
        "member",
        req.body.language
      ));
    }

    if (req.body.coMembers && !Array.isArray(req.body.coMembers)) {
      return (this.error = MembershipPassErrors.membershipPassParamsError(
        "coMembers",
        req.body.language
      ));
    }

    if (
      req.body.membershipPhoto &&
      (typeof req.body.membershipPhoto !== "object" ||
        Array.isArray(req.body.membershipPhoto))
    ) {
      return (this.error = MembershipPassErrors.membershipPassParamsError(
        "membershipPhoto",
        req.body.language
      ));
    }

    if (req.body.membershipPhoto && !req.body.membershipPhoto.bytes) {
      return (this.error = MembershipPassErrors.membershipPassParamsError(
        "membershipPhoto",
        req.body.language
      ));
    }
  }

  static validateUpdateUserMembershipPass(req) {
    const requiredParams = [
      "email",
      "mandaiId",
      "group",
      "passType",
      "visualId",
      "categoryType",
      "member",
      "validUntil",
      "coMembers",
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
      const dob = validateDOBiso(req.body.member.dob);
      if (!dob) {
        return (this.error = MembershipPassErrors.membershipPassParamsError(
          "member_dob",
          req.body.language
        ));
      }
    }

    if (!req.body.member.firstName) {
      return (this.error = MembershipPassErrors.membershipPassParamsError(
        "member_first_name",
        req.body.language
      ));
    }

    if (!req.body.member.lastName) {
      return (this.error = MembershipPassErrors.membershipPassParamsError(
        "member_last_name",
        req.body.language
      ));
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

    if (!req.body.parking || (req.body.parking && req.body.parking === "no")) {
      if (req.body.iu !== null) {
        return (this.error = MembershipPassErrors.membershipPassParamsError(
          "iu",
          req.body.language
        ));
      } else if (req.body.carPlate !== null) {
        return (this.error = MembershipPassErrors.membershipPassParamsError(
          "carPlate",
          req.body.language
        ));
      }
    }

    if (
      req.body.member &&
      (typeof req.body.member !== "object" || Array.isArray(req.body.member))
    ) {
      return (this.error = MembershipPassErrors.membershipPassParamsError(
        "member",
        req.body.language
      ));
    }

    if (req.body.coMembers && !Array.isArray(req.body.coMembers)) {
      return (this.error = MembershipPassErrors.membershipPassParamsError(
        "coMembers",
        req.body.language
      ));
    }

    if (
      req.body.membershipPhoto &&
      (typeof req.body.membershipPhoto !== "object" ||
        Array.isArray(req.body.membershipPhoto))
    ) {
      return (this.error = MembershipPassErrors.membershipPassParamsError(
        "membershipPhoto",
        req.body.language
      ));
    }

    if (req.body.membershipPhoto && !req.body.membershipPhoto.bytes) {
      return (this.error = MembershipPassErrors.membershipPassParamsError(
        "membershipPhoto",
        req.body.language
      ));
    }
  }
}

module.exports = UserMembershipPassValidation;
