const cognitoService = require('../../services/cognitoService');
const userCredentialModel = require('../../db/models/userCredentialModel');
const loggerService = require('../../logs/logger');
const LogoutErrors = require('../../config/https/errors/logoutErrors');
const { maskKeyRandomly } = require('../../utils/common');
const UserCredentialEventService = require('./userCredentialEventService');
const { EVENTS } = require('../../utils/constants');

class UserLogoutService {
  async getUser(token, body) {
    try {
      const userDB = await userCredentialModel.findByUserEmailOrMandaiId(
        body.email || '',
        body.mandaiId || '',
      );
      return {
        userId: userDB.user_id ? userDB.user_id : '',
        email: userDB.email,
      };
    } catch (error) {
      loggerService.error(
        {
          user: {
            token: maskKeyRandomly(token),
            layer: 'userLogoutServices.getUser',
            error: new Error(error),
          },
        },
        {},
        '[CIAM] Get User For Logout Request - Failed',
      );
      throw new Error(JSON.stringify(LogoutErrors.ciamLogoutUserNotFound(body.language)));
    }
  }

  async execute(token, body) {
    const userInfo = await this.getUser(token, body);
    if (!userInfo.userId) {
      throw new Error(JSON.stringify(LogoutErrors.ciamLogoutUserNotFound(body.language)));
    }

    try {
      await cognitoService.cognitoUserLogout(userInfo.email);
      await userCredentialModel.updateByUserId(userInfo.userId, {
        tokens: null,
      });
      await UserCredentialEventService.createEvent(
        {
          eventType: EVENTS.LOGOUT,
          data: {
            token,
            ...body,
          },
          source: 1,
          status: 1,
        },
        userInfo.userId,
      );
    } catch (error) {
      await UserCredentialEventService.createEvent(
        {
          eventType: EVENTS.LOGOUT,
          data: {
            token,
            ...body,
            error: new Error(error),
          },
          source: 1,
          status: 0,
        },
        null,
        body.email || '',
        body.mandaiId || '',
      );
      throw new Error(JSON.stringify(LogoutErrors.ciamLogoutUserNotFound(body.language)));
    }
  }
}

module.exports = new UserLogoutService();
