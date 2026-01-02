process.env.APP_ENV = 'dev';

const { EVENTS, STATUS } = require('../../../utils/constants');

jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

jest.mock('../../../services/commonService', () => ({
  cleanData: (data) => data,
}));

jest.mock('../../../logs/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../../services/cognitoService', () => ({
  cognitoInitiatePasswordlessLogin: jest.fn(),
  cognitoVerifyPasswordlessLogin: jest.fn(),
}));

jest.mock('../../../api/users/helpers/userUpdateMembershipPassesHelper', () => ({
  getUserFromDBCognito: jest.fn(),
}));

jest.mock('../../../api/users/userCredentialEventService', () => ({
  createEvent: jest.fn(),
}));

jest.mock('../../../api/users/myAccount/passwordless/passwordlessSendCodeServices', () => ({
  updateTokenSession: jest.fn(),
}));

jest.mock('../../../api/users/userLoginServices', () => ({
  updateUser: jest.fn(),
}));

jest.mock('../../../db/models/passwordlessTokenModel', () => ({
  incrementAttemptById: jest.fn(),
  markTokenAsInvalid: jest.fn(),
  getTokenById: jest.fn(),
}));

jest.mock('../../../db/models/configsModel', () => ({
  getValueByConfigValueName: jest.fn(),
}));

jest.mock('../../../db/models/userCredentialEventsModel', () => ({
  getLastLoginEvent: jest.fn(),
}));

jest.mock('../../../db/models/userModel', () => ({
  update: jest.fn(),
}));

jest.mock('../../../config/appConfig', () => ({
  AEM_CALLBACK_URL_DEV: 'https://dev.example.com',
  AEM_CALLBACK_PATH: '/callback',
}));

jest.mock('../../../utils/cryptoEnvelope', () => ({
  decrypt: jest.fn(),
  encrypt: jest.fn(),
}));

const { sendCode } = require('../../../api/users/myAccount/passwordless/passwordlessControllers');
const { cognitoInitiatePasswordlessLogin } = require('../../../services/cognitoService');
const {
  getUserFromDBCognito,
} = require('../../../api/users/helpers/userUpdateMembershipPassesHelper');
const { createEvent } = require('../../../api/users/userCredentialEventService');
const {
  updateTokenSession,
} = require('../../../api/users/myAccount/passwordless/passwordlessSendCodeServices');

describe('passwordlessControllers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendCode', () => {
    const mockReq = {
      body: {
        email: 'test@example.com',
        language: 'en',
      },
    };

    const mockUserInfo = {
      db: { id: 123, email: 'test@example.com' },
      cognito: { Username: 'test@example.com' },
    };

    const mockCognitoResponse = {
      session: 'mock-aws-session-token',
    };

    it('should create SEND_OTP event BEFORE calling Cognito', async () => {
      getUserFromDBCognito.mockResolvedValue(mockUserInfo);
      createEvent.mockResolvedValue({ id: 1 });
      cognitoInitiatePasswordlessLogin.mockResolvedValue(mockCognitoResponse);
      updateTokenSession.mockResolvedValue();

      const callOrder = [];
      createEvent.mockImplementation(() => {
        callOrder.push('createEvent');
        return Promise.resolve({ id: 1 });
      });
      cognitoInitiatePasswordlessLogin.mockImplementation(() => {
        callOrder.push('cognitoInitiatePasswordlessLogin');
        return Promise.resolve(mockCognitoResponse);
      });

      await sendCode(mockReq);

      expect(callOrder).toEqual(['createEvent', 'cognitoInitiatePasswordlessLogin']);
    });

    it('should create SEND_OTP event with pending flag and user id', async () => {
      getUserFromDBCognito.mockResolvedValue(mockUserInfo);
      createEvent.mockResolvedValue({ id: 1 });
      cognitoInitiatePasswordlessLogin.mockResolvedValue(mockCognitoResponse);
      updateTokenSession.mockResolvedValue();

      await sendCode(mockReq);

      expect(createEvent).toHaveBeenCalledWith(
        {
          eventType: EVENTS.SEND_OTP,
          data: { email: 'test@example.com', pending: true },
          source: 7,
          status: STATUS.SUCCESS,
        },
        mockUserInfo.db.id,
      );
    });

    it('should call updateTokenSession after Cognito responds', async () => {
      getUserFromDBCognito.mockResolvedValue(mockUserInfo);
      createEvent.mockResolvedValue({ id: 1 });
      cognitoInitiatePasswordlessLogin.mockResolvedValue(mockCognitoResponse);
      updateTokenSession.mockResolvedValue();

      await sendCode(mockReq);

      expect(updateTokenSession).toHaveBeenCalledWith(
        'test@example.com',
        mockCognitoResponse.session,
      );
    });

    it('should return success response when OTP is sent', async () => {
      getUserFromDBCognito.mockResolvedValue(mockUserInfo);
      createEvent.mockResolvedValue({ id: 1 });
      cognitoInitiatePasswordlessLogin.mockResolvedValue(mockCognitoResponse);
      updateTokenSession.mockResolvedValue();

      const result = await sendCode(mockReq);

      expect(result).toEqual({
        auth: {
          method: 'passwordless',
          code: 200,
          mwgCode: 'MWG_CIAM_USERS_OTP_SENT_SUCCESS',
          message: expect.any(String),
        },
        status: 'success',
        statusCode: 200,
      });
    });

    it('should throw error if getUserFromDBCognito fails', async () => {
      const error = new Error('User not found');
      getUserFromDBCognito.mockRejectedValue(error);

      await expect(sendCode(mockReq)).rejects.toThrow('User not found');
      expect(createEvent).not.toHaveBeenCalled();
      expect(cognitoInitiatePasswordlessLogin).not.toHaveBeenCalled();
    });

    it('should throw error if createEvent fails', async () => {
      getUserFromDBCognito.mockResolvedValue(mockUserInfo);
      createEvent.mockRejectedValue(new Error('DB error'));

      await expect(sendCode(mockReq)).rejects.toThrow('DB error');
      expect(cognitoInitiatePasswordlessLogin).not.toHaveBeenCalled();
    });

    it('should throw error if Cognito call fails', async () => {
      getUserFromDBCognito.mockResolvedValue(mockUserInfo);
      createEvent.mockResolvedValue({ id: 1 });
      cognitoInitiatePasswordlessLogin.mockRejectedValue(new Error('Cognito error'));

      await expect(sendCode(mockReq)).rejects.toThrow('Cognito error');
      expect(createEvent).toHaveBeenCalled();
    });
  });
});
