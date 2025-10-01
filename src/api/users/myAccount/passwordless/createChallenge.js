// src/api/users/myAccount/passwordless/createChallenge.js
const validator = require("validator");
const { messageLang } = require("../../../../utils/common");
const PasswordlessSendCodeService = require("./passwordlessSendCodeServices");
const { getUserFromDBCognito, isUserExisted } = require("../../helpers/userUpdateMembershipPassesHelper");
const emailService = require("../../usersEmailService");

/**
 * Create
 * Generate OTP
 * Send email
 */
module.exports = async function createChallenge(req) {
  const { email } = req.body;

  //User exist check
  const userInfo = await getUserFromDBCognito(email);
  const isNewUser = !isUserExisted(userInfo);

  if (isNewUser) {
    const emailSanitised = validator.isEmail(email) ? email.trim() : "";
    return {
      auth: {
        code: 200,
        mwgCode: "MWG_CIAM_USERS_SIGNUP_NOT_SUPPORTED",
        message: "OTP signup is currently not supported.",
        email: emailSanitised,
      },
      status: "success",
      statusCode: 200,
    };
  }

  //Generate code (interval/expiry/salt handled in service)
  const codeData = await PasswordlessSendCodeService.generateCode(req, "login");

  await emailService.emailServiceAPI(req, true, codeData);

  //Send email
  // await PasswordlessSendCodeService.sendEmail(req, codeData, "login");

  return {
    auth: {
      method: "passwordless",
      code: 200,
      mwgCode: "MWG_CIAM_USERS_OTP_SENT_SUCCESS",
      message: messageLang("sendCode_success", req.body.language),
    },
    status: "success",
    statusCode: 200,
  };
};
