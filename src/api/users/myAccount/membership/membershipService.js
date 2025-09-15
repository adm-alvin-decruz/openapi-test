const userModel = require("../../../../db/models/userModel");
const { messageLang, omit } = require("../../../../utils/common");
const loggerService = require("../../../../logs/logger");
const GetMembershipError = require("../../../../config/https/errors/membershipErrors");
const { preSignedURLS3 } = require("../../../../services/s3Service");

function loggerWrapper(action, obj, type = "logInfo") {
  if (type === "error") {
    return loggerService.error({ servicePortal: { ...obj } }, {}, action);
  }

  return loggerService.log({ servicePortal: { ...obj } }, action);
}

//Search users
async function retrieveMembership(data) {
  const language = data.language;
  const email = data.email;
  try {
    //define query for model
    const rs = await userModel.retrieveMembership(email);
    const memberships = await Promise.all(rs.memberships.map(async ele => {
      const signedURL = await preSignedURLS3(ele.photoUrl);
      return {
        ...ele,
        photoUrl: signedURL
      }
    }))

    return {
      user_memberships: {
        ...rs,
        memberships
      },
      mwgCode: "MWG_CIAM_GET_USER_MEMBERSHIPS_SUCCESS",
      message: messageLang("get_membership_success", language),
      status: "success",
      statusCode: 200,
    };
  } catch (error) {
    loggerWrapper(
      "[CIAM-ServicePortal] Error Retrieve Memberships",
      { email, error: new Error(error), layer: "service.retrieveMembership" },
      "error",
    );
    throw new Error(
      JSON.stringify(GetMembershipError.ciamMembershipGetPassesInvalid(language)),
    );
  }
}

/** export the module */
module.exports = {
  retrieveMembership,
};