const cognitoService = require('../services/cognitoService');
const { getOrCheck } = require('../utils/cognitoAttributes');
const loggerService = require('../logs/logger');
const MembershipErrors = require('../config/https/errors/membershipErrors');
const { getPassType } = require('./dbConfigsHelpers');

async function updateMembershipInCognito(data) {
  try {
    const cognitoUser = await cognitoService.cognitoAdminGetUserByEmail(data.email);
    const existingMemberships = JSON.parse(getOrCheck(cognitoUser, 'custom:membership'));

    // reformat "custom:membership" to JSON array
    const updatedMemberships = await formatCustomMembershipAttribute(data, existingMemberships);
    let updateParams = [
      { Name: 'custom:membership', Value: JSON.stringify(updatedMemberships) },
      { Name: 'custom:vehicle_iu', Value: data.iu || 'null' },
      { Name: 'custom:vehicle_plate', Value: data.carPlate || 'null' },
    ];

    loggerService.log(
      {
        user: {
          userEmail: data.email,
          existingMemberships: JSON.stringify(existingMemberships),
          updatedMemberships: JSON.stringify(updatedMemberships),
          params: JSON.stringify(updateParams),
          layer: 'userMembershipPassService.updateMembershipInCognito',
        },
      },
      'Start updateMembershipInCognito',
    );
    // update cognito custom membership
    let cognitoResult = await cognitoService.cognitoAdminUpdateNewUser(updateParams, data.email);

    loggerService.log(
      {
        user: {
          userEmail: data.email,
          layer: 'userMembershipPassService.updateMembershipInCognito',
          data: JSON.stringify(cognitoResult),
        },
      },
      'End updateMembershipInCognito - Success',
    );
  } catch (error) {
    loggerService.error(
      {
        user: {
          userEmail: data.email,
          layer: 'userMembershipPassService.updateMembershipInCognito',
          error: new Error(error),
        },
      },
      {},
      'End updateMembershipInCognito - Failed',
    );
    JSON.stringify(MembershipErrors.ciamMembershipUserNotFound(data.email, data.language));
  }
}

async function formatCustomMembershipAttribute(data, existingMemberships) {
  const passTypeMapping = await getPassType(data);
  const newMembership = {
    name: passTypeMapping,
    visualID: data.visualId,
    expiry: data.validUntil || null,
  };

  if (existingMemberships === null || existingMemberships === false) {
    return [newMembership];
  }

  //handle new format membership in Cognito
  if (Array.isArray(existingMemberships)) {
    let updatedMemberships;
    // Check if any existing membership needs to be updated based on visualId
    const membershipToUpdateIdx = existingMemberships.findIndex(
      (membership) => membership.visualID === newMembership.visualID,
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
  if (typeof existingMemberships === 'object') {
    // Check if any existing membership needs to be updated based on visualId
    return existingMemberships.visualID === newMembership.visualID
      ? [newMembership]
      : [existingMemberships, newMembership];
  }
}

/**
 * Mapping user cognito attributes information to object {key:value}
 * @param userCognito - user cognito information
 * @return {<Object>} {
 *         "custom:mandai_id": string,
 *         "custom:visual_id": string,
 *         "emai": string,
 *         "give_name": string,
 *         "family_name": string
 * }
 */
function parseCognitoAttributeObject(userCognito) {
  if (!userCognito || !userCognito.UserAttributes || userCognito.UserAttributes.length <= 0) {
    return null;
  }

  const attributes = {};
  userCognito.UserAttributes.forEach((attr) => {
    attributes[attr.Name] = attr.Value;
  });
  return { ...attributes };
}

module.exports = {
  updateMembershipInCognito,
  parseCognitoAttributeObject,
};
