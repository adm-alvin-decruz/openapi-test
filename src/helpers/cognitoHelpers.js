const cognitoService = require("../services/cognitoService");
const { getOrCheck } = require("../utils/cognitoAttributes");

async function updateMembershipInCognito(reqBbody) {
  try {
      const cognitoUser = await cognitoService.cognitoAdminGetUserByEmail(req.body.email.trim().toLowerCase());
      // const groupsCognitoInfo = await cognitoService.cognitoAdminListGroupsForUser(req.body.email.trim().toLowerCase());
      // let groups = groupsCognitoInfo.Groups && groupsCognitoInfo.Groups.length > 0
      // ? groupsCognitoInfo.Groups
      // : [];
      // let isMatchedGroup = groups.filter((gr) => gr.GroupName === req.body.group).length > 0;


      const existingMemberships = JSON.parse(getOrCheck(cognitoUser, "custom:membership"));

      // reformat "custom:membership" to JSON array
      const updatedMemberships = await formatMembershipData(req, existingMemberships);
      let updateParams = [
        {Name: "custom:membership", Value: JSON.stringify(updatedMemberships)},
        {Name: "custom:vehicle_iu", Value: req.body.iu || "null"},
        {Name: "custom:vehicle_plate", Value: req.body.carPlate || "null"}
      ];

      loggerService.log(
        {
        user: {
          userEmail: req.body.email,
          existingMemberships: JSON.stringify(existingMemberships),
          updatedMemberships: JSON.stringify(updatedMemberships),
          params: updateParams,
          layer: "userMembershipPassService.updateMembershipInCognito",
          data: JSON.stringify(req.body),
        },
     },
     "Start updateMembershipInCognito"
    );
    let cognitoResult = await cognitoService.cognitoAdminUpdateNewUser(updateParams, req.body.email.trim().toLowerCase());
    console.log("AAA", cognitoResult);
    loggerService.log(
      {
        user: {
          userEmail: req.body.email,
          layer: "userMembershipPassService.updateMembershipInCognito",
          data: JSON.stringify(cognitoResult)
        },
      },
      "End updateMembershipInCognito - Success"
    );
    return {cognitoProceed: "success"};

  } catch (error) {
    loggerService.error(
      {
        user: {
          userEmail: req.body.email,
          layer: "userMembershipPassService.updateMembershipInCognito",
          error: new Error(error),
        },
      },
      {},
      "End updateMembershipInCognito - Failed"
    );
    JSON.stringify(
      MembershipErrors.ciamMembershipUserNotFound(
        req.body.email,
        req.body.language
      )
    );
  }
}

async function formatMembershipData(req, existingMemberships) {
  try{
    const passTypeMapping = await this.getPassType(req);
    const newMembership = {
      name: passTypeMapping,
      visualID: req.body.visualId,
      expiry: req.body.validUntil || null,
    };

    if (existingMemberships === null || existingMemberships === false) {
      return [newMembership];
    }

    //handle new format membership in Cognito
    if (Array.isArray(existingMemberships)) {
      let updatedMemberships;
      // Check if any existing membership needs to be updated based on visualId
      const membershipToUpdateIdx = existingMemberships.findIndex(
        (membership) => membership.visualID === newMembership.visualID
      );

      if (membershipToUpdateIdx >= 0) {
        existingMemberships[membershipToUpdateIdx] = newMembership;
        updatedMemberships = [...existingMemberships];
      } else {
        updatedMemberships = [...existingMemberships, newMembership];
      }
      return updatedMemberships || null;
    }

    //handle old format membership in Cognito
    if (typeof existingMemberships === "object") {
      // Check if any existing membership needs to be updated based on visualId
      return existingMemberships.visualID === newMembership.visualID
        ? [newMembership]
        : [existingMemberships, newMembership];
    }
  } catch (error) {
    console.log("UserMembershipPassService.formatMembershipData error", new Error(error));
  }
}

module.exports = {
  updateMembershipInCognito,
};


