require('dotenv').config();
const UserValidateResetPasswordService = require('../users/userValidateResetPasswordService');
const cognitoService = require('../../services/cognitoService');
const { getOrCheck } = require('../../utils/cognitoAttributes');
const MembershipErrors = require('../../config/https/errors/membershipErrors');
const userCredentialModel = require('../../db/models/userCredentialModel');
const UserCredentialEventService = require('./userCredentialEventService');
const { getCurrentUTCTimestamp } = require('../../utils/dateUtils');
const { messageLang } = require('../../utils/common');
const loggerService = require('../../logs/logger');
const { EVENTS } = require('../../utils/constants');
const { switchIsTurnOn } = require('../../helpers/dbSwitchesHelpers');
const UserPasswordVersionService = require('./userPasswordVersionService');
const CommonErrors = require('../../config/https/errors/commonErrors');
const passwordService = require('./userPasswordService');

class UserConfirmResetPasswordService {
  async execute(body) {
    let userId = '';
    try {
      const rs = await UserValidateResetPasswordService.execute(body.passwordToken, body.language);

      userId = rs.userId;

      const enablePasswordVersionChecking = await switchIsTurnOn('enable_password_versioning');
      if (enablePasswordVersionChecking) {
        const newPasswordHadMarkedVersion =
          await UserPasswordVersionService.passwordValidProcessing(rs.userId, body.newPassword);
        if (newPasswordHadMarkedVersion) {
          await Promise.reject(
            new Error(JSON.stringify(CommonErrors.sameOldPasswordException(body.language))),
          );
        }
      }

      const userCognito = await cognitoService.cognitoAdminGetUserByEmail(rs.email);

      const userEmail = getOrCheck(userCognito, 'email');
      await cognitoService.cognitoAdminSetUserPassword(userEmail, body.newPassword);
      //save db
      const password_hash = await passwordService.hashPassword(body.newPassword);
      const dataUpdate = {
        salt: null,
        password_hash,
        tokens: {
          ...rs.tokens,
          reset_token: {
            ...rs.tokens.reset_token,
            reset_at: getCurrentUTCTimestamp(),
          },
        },
      };
      await userCredentialModel.updateByUserEmail(rs.email, dataUpdate);

      //insert events
      await UserCredentialEventService.createEvent(
        {
          eventType: EVENTS.PASSWORD_CHANGE,
          data: dataUpdate,
          source: 1,
          status: 1,
        },
        userId,
      );
      return {
        membership: {
          code: 200,
          mwgCode: 'MWG_CIAM_USERS_EMAIL_RESET_PASSWORD_SUCCESS',
          message: messageLang('confirm_reset_password_success', body.language),
          passwordToken: body.passwordToken,
          resetCompletedAt: new Date(),
        },
        status: 'success',
        statusCode: 200,
      };
    } catch (error) {
      await UserCredentialEventService.createEvent(
        {
          eventType: EVENTS.PASSWORD_CHANGE,
          data: {
            ...body,
            error: JSON.stringify(error),
          },
          source: 1,
          status: 0,
        },
        userId,
      );
      loggerService.error(`Error UserConfirmResetPasswordService.execute Error: ${error}`, body);
      const errorMessage = error.message ? JSON.parse(error.message) : '';
      const errorData = errorMessage.data && errorMessage.data.name ? errorMessage.data : '';

      //catch error cognito not found user
      if (errorData.name && errorData.name === 'UserNotFoundException') {
        throw new Error(
          JSON.stringify(MembershipErrors.ciamMembershipUserNotFound('', body.language)),
        );
      }

      //forward error message from validate token
      if (errorMessage && errorMessage.membership && errorMessage.membership.mwgCode) {
        throw new Error(JSON.stringify(errorMessage));
      }

      throw new Error(
        JSON.stringify(MembershipErrors.ciamMembershipEmailInvalid('', body.language)),
      );
    }
  }
}

module.exports = new UserConfirmResetPasswordService();
