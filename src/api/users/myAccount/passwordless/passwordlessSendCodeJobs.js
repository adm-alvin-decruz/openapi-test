const PasswordlessSendCodeService = require('./passwordlessSendCodeServices');
const UserSignupService = require('../../userSignupService');
const { messageLang } = require('../../../../utils/common');
const configsModel = require('../../../../db/models/configsModel');
const validator = require('validator');
const {
  getUserFromDBCognito,
  isUserExisted,
} = require('../../helpers/userUpdateMembershipPassesHelper');

class PasswordlessSendCodeJob {
  success(lang) {
    return {
      auth: {
        method: 'passwordless',
        code: 200,
        mwgCode: 'MWG_CIAM_USERS_OTP_SENT_SUCCESS',
        message: messageLang('sendCode_success', lang),
      },
      status: 'success',
      statusCode: 200,
    };
  }

  notSupported(email) {
    const emailSanitised = validator.isEmail(email) ? email.trim() : '';
    return {
      auth: {
        code: 200,
        mwgCode: 'MWG_CIAM_USERS_SIGNUP_NOT_SUPPORTED',
        message: 'OTP signup is currently not supported.',
        email: emailSanitised,
      },
      status: 'success',
      statusCode: 200,
    };
  }

  async send(req) {
    const email = req.body.email;
    try {
      const userInfo = await getUserFromDBCognito(email);
      // check if it's a new user
      const isNewUser = !isUserExisted(userInfo);

      if (isNewUser) {
        return this.notSupported(email);
      }

      const purpose = isNewUser ? 'signup' : 'login';

      //should be move to switches
      // const sendSignupEmail = (
      //   await configsModel.findByConfigKey("passwordless", "send_signup_email")
      // )?.value;

      const codeData = await PasswordlessSendCodeService.generateCode(req, purpose);

      const sendEmailRes = await PasswordlessSendCodeService.sendEmail(req, codeData);
      console.log('sendEmailRes: ', JSON.stringify(sendEmailRes));

      return this.success(req, req.body.language);
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      throw new Error(JSON.stringify(errorMessage));
    }
  }
}

module.exports = new PasswordlessSendCodeJob();
