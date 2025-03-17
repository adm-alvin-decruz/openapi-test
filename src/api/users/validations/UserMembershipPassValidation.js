const MembershipPassErrors = require("../../../config/https/errors/membershipPassErrors");
const { validateDOBiso } = require("../../../services/validationService");
const configsModel = require("../../../db/models/configsModel");
const commonService = require("../../../services/commonService");

class UserMembershipPassValidation {
  constructor() {
    this.error = null;
  }

  static async isPassTypeValid(passType) {
    const passesSupported = await configsModel.findByConfigKey(
      "membership-passes",
      "pass-type"
    );

    const passes =
      passesSupported &&
      passesSupported.value &&
      passesSupported.value.length > 0
        ? passesSupported.value
        : [];
    return passes.includes(passType);
  }

  static async validateCreateUserMembershipPass(req) {
    const requiredParams =
      req.body && req.body.migrations
        ? [
            "email",
            "group",
            "passType",
            "visualId",
            "categoryType",
            // "adultQty",
            // "childQty",
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

    const isPassTypeValid = await this.isPassTypeValid(req.body.passType);
    if (!isPassTypeValid) {
      return (this.error = MembershipPassErrors.membershipPassParamsError(
        "passType",
        req.body.language
      ));
    }

    const requestFromAEM = commonService.isRequestFromAEM(req.headers);

    if (req.body.member?.dob && requestFromAEM) {
      const dob = validateDOBiso(req.body.member.dob);
      if (!dob) {
        return (this.error = MembershipPassErrors.membershipPassParamsError(
          "member_dob",
          req.body.language
        ));
      }
    }

    // commented, revisit this validation if require
    // if (req.body.adultQty !== 1 && req.body.adultQty !== 2) {
    //   return (this.error = MembershipPassErrors.membershipPassParamsError(
    //     "adultQty",
    //     req.body.language
    //   ));
    // }

    // commented, revisit this validation if require, chilQty can be more than 2
    // if (req.body.childQty < 0 || req.body.childQty > 2) {
    //   return (this.error = MembershipPassErrors.membershipPassParamsError(
    //     "childQty",
    //     req.body.language
    //   ));
    // }

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

  static async validateUpdateUserMembershipPass(req) {
    const requiredParams = [
      "email",
      "mandaiId",
      "group",
      "passType",
      "visualId",
    ];
    const requestFromAEM = commonService.isRequestFromAEM(req.headers);
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

    const isPassTypeValid = await this.isPassTypeValid(req.body.passType);
    if (!isPassTypeValid) {
      return (this.error = MembershipPassErrors.membershipPassParamsError(
        "passType",
        req.body.language
      ));
    }

    if (req.body.member?.dob && requestFromAEM) {
      const dob = validateDOBiso(req.body.member.dob);
      if (!dob) {
        return (this.error = MembershipPassErrors.membershipPassParamsError(
          "member_dob",
          req.body.language
        ));
      }
    }

    // if (!req.body.member.firstName) {
    //   return (this.error = MembershipPassErrors.membershipPassParamsError(
    //     "member_first_name",
    //     req.body.language
    //   ));
    // }

    // if (!req.body.member.lastName) {
    //   return (this.error = MembershipPassErrors.membershipPassParamsError(
    //     "member_last_name",
    //     req.body.language
    //   ));
    // }

    // if (
    //   req.body.adultQty &&
    //   req.body.adultQty !== 1 &&
    //   req.body.adultQty !== 2
    // ) {
    //   return (this.error = MembershipPassErrors.membershipPassParamsError(
    //     "adultQty",
    //     req.body.language
    //   ));
    // }

    // if ((req.body.childQty && req.body.childQty < 0) || req.body.childQty > 2) {
    //   return (this.error = MembershipPassErrors.membershipPassParamsError(
    //     "childQty",
    //     req.body.language
    //   ));
    // }

    if (req.body.parking && !["yes", "no"].includes(req.body.parking)) {
      return (this.error = MembershipPassErrors.membershipPassParamsError(
        "parking",
        req.body.language
      ));
    }

    if (req.body.parking && req.body.parking === "yes") {
      if (!req.body.iu || !req.body.iu.trim().length) {
        return (this.error = MembershipPassErrors.membershipPassParamsError(
          "iu",
          req.body.language
        ));
      }
      if (!req.body.carPlate || !req.body.carPlate.trim().length) {
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
