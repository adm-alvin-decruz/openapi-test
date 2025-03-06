const userMembershipModel = require("../../../db/models/userMembershipModel");
const { GROUP } = require("../../../utils/constants");
const { getCurrentUTCTimestamp } = require("../../../utils/dateUtils");
const passkitExpireService = require("../../components/passkit/services/passkitExpireService");

async function handlePasskitExpire(req, membershipId) {
  const mwgAppID =
    req.headers && req.headers["mwg-app-id"] ? req.headers["mwg-app-id"] : "";
  const membershipDetails =
    await userMembershipModel.queryMembershipDetailsByMembershipId(
      membershipId
    );
  const permittedRequest =
    mwgAppID.includes("nopComm") && req.body.group === GROUP.MEMBERSHIP_PASSES;

  //Acceptable condition for trigger: NC request + Group is Membership-passes + membership info is available
  if (permittedRequest && membershipDetails) {
    const status = req.body.status || -1;
    const validUntil = req.body.validUntil;
    const currentDate = getCurrentUTCTimestamp();

    if (status !== 0 || (validUntil && validUntil <= currentDate)) {
      await passkitExpireService.triggerPasskitExpire(
        req,
        membershipDetails
      );
      //TODO: update trail_table
    }
  }
  return null;
}

module.exports = {
  handlePasskitExpire,
};
