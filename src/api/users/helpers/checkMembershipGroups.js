const cognitoService = require('../../../services/cognitoService');
const userMembership = require('../../../db/models/userMembershipModel');
const configsModel = require('../../../db/models/configsModel');
const { GROUP } = require('../../../utils/constants');

async function checkUserBelongSpecificGroup(email, group, userCognito) {
  try {
    const passkit = await userMembership.queryUserPassType(email);
    //if passkit more than 1 - Lay on DB for checking
    if (passkit && passkit.passType && passkit.passType.length > 1) {
      if (group === GROUP.MEMBERSHIP_PASSES) {
        const passkitConfig = await configsModel.findByConfigKey('membership-passes', 'pass-type');
        const passkitMembershipPasses =
          passkitConfig && passkitConfig.value.length ? passkitConfig.value : [];
        return passkit.passType.every((pass) =>
          passkitMembershipPasses.includes(pass.toLowerCase()),
        );
      }
      //check wildpass if applicable
      return passkit.passType.every((pass) => pass === group);
    }
    const cognitoUser = userCognito
      ? userCognito
      : await cognitoService.cognitoAdminGetUserByEmail(email);
    if (group === GROUP.WILD_PASS) {
      return await cognitoService.checkUserBelongOnlyWildpass(email, cognitoUser);
    }
    if (group === GROUP.MEMBERSHIP_PASSES) {
      return await cognitoService.checkUserBelongOnlyMembershipPasses(email, cognitoUser);
    }
  } catch (error) {
    throw new Error('User does not have wildpass or membership-passes group.');
  }
}

module.exports = {
  checkUserBelongSpecificGroup,
};
