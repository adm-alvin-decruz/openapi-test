// use dotenv
require("dotenv").config();

const membershipsService = require("./membershipsServices");
const MembershipCheckValidation = require("./validations/MembershipCheckValidation");

/**
 * Function get user by email using AdminGetUserCommand
 * After that using the response and req body to process membership
 *
 * @returns JSON user
 */
async function adminGetUser(reqBody) {
  // validate request params
  const message = MembershipCheckValidation.execute(reqBody);
  if (!!message) {
    throw new Error(JSON.stringify(message));
  }

  try {
    return await membershipsService.checkUserMembership(reqBody);
  } catch (error) {
    const errorMessage = JSON.parse(error.message);
    throw new Error(JSON.stringify(errorMessage));
  }
}

module.exports = {
  adminGetUser,
};
