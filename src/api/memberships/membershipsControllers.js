// use dotenv
require("dotenv").config();

const membershipsService = require("./membershipsServices");
const MembershipCheckValidation = require("./validations/MembershipCheckValidation");
const loggerService = require("../../logs/logger");

/**
 * Function get user by email using AdminGetUserCommand
 * After that using the response and req body to process membership
 *
 * @returns JSON user
 */
async function adminGetUser(reqBody) {
  // validate request params
  loggerService.log(
    {
      membership: {
        action: "checkUserMembership",
        request: reqBody,
        layer: "membershipsController.adminGetUser",
      },
    },
    "[CIAM] Start Check User Membership"
  );
  const message = MembershipCheckValidation.execute(reqBody);
  if (!!message) {
    throw new Error(JSON.stringify(message));
  }

  try {
    const rs = await membershipsService.checkUserMembership(reqBody);
    loggerService.log(
      {
        membership: {
          action: "checkUserMembership",
          layer: "membershipsController.adminGetUser",
          response: JSON.stringify(rs),
        },
      },
      "[CIAM] End Check User Membership - Success"
    );
    return rs;
  } catch (error) {
    loggerService.error(
      {
        membership: {
          action: "checkUserMembership",
          request: reqBody,
          layer: "membershipsController.adminGetUser",
          error: `${error}`,
        },
      },
      {},
      "[CIAM] End Check User Membership - Failed"
    );
    const errorMessage = JSON.parse(error.message);
    throw new Error(JSON.stringify(errorMessage));
  }
}

module.exports = {
  adminGetUser,
};
