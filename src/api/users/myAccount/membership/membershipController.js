const membershipService = require("./membershipService");
const CommonErrors = require("../../../../config/https/errors/commonErrors");

async function retrieveMembership(body) {
  try {
    return await membershipService.retrieveMembership(body);
  } catch (error) {
    const errorMessage = error && error.message ? JSON.parse(error.message) : "";
    if (errorMessage) {
      throw new Error(JSON.stringify(errorMessage));
    }
    throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
  }
}

async function deleteUserMembership(body) {
  try {
    return await membershipService.deleteUserMembership(body);
  } catch (error) {
    const errorMessage = error && error.message ? JSON.parse(error.message) : "";
    if (errorMessage) {
      throw new Error(JSON.stringify(errorMessage));
    }
    throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
  }
}

module.exports = {
  retrieveMembership,
  deleteUserMembership,
};
