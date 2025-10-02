const UserConfirmResetPasswordService = require('../../../api/users/userConfirmResetPasswordService');
const userCredentialModel = require('../../../db/models/userCredentialModel');
const cognitoService = require('../../../services/cognitoService');
const UserValidateResetPasswordService = require('../../../api/users/userValidateResetPasswordService');

jest.mock('../../../db/models/userCredentialModel', () => ({
  findByPasswordHash: jest.fn(),
  updateByUserEmail: jest.fn(),
}));
jest.mock('../../../api/users/userValidateResetPasswordService', () => ({
  execute: jest.fn(),
}));
jest.mock('../../../services/cognitoService', () => ({
  cognitoAdminGetUserByEmail: jest.fn(),
  cognitoAdminSetUserPassword: jest.fn(),
}));
jest.mock('../../../utils/dateUtils', () => ({
  getCurrentUTCTimestamp: jest.fn(),
}));

describe('UserConfirmResetPasswordService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('execute', () => {
    it('should throw an error when UserValidateResetPasswordService throw error', async () => {
      jest.spyOn(UserValidateResetPasswordService, 'execute').mockRejectedValue(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: 'MWG_CIAM_PASSWORD_ERR_03',
              message: 'Token has already been used.',
            },
            status: 'success',
            statusCode: 200,
          }),
        ),
      );
      await expect(
        UserConfirmResetPasswordService.execute({
          newPassword: 'Password123##',
          confirmPassword: 'Password123##',
          passwordToken: '670a760c7256b2cc6349e568f2b470ba',
        }),
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: 'MWG_CIAM_PASSWORD_ERR_03',
              message: 'Token has already been used.',
            },
            status: 'success',
            statusCode: 200,
          }),
        ),
      );
    });
    it('should throw an error when cognitoAdminGetUserByEmail not found user', async () => {
      jest.spyOn(UserValidateResetPasswordService, 'execute').mockResolvedValue({
        token: '123',
        email: 'test@gmail.com',
        tokens: {
          reset_token: {
            expires_at: '2025-01-05 06:30:30',
            reset_at: null,
          },
        },
      });
      jest.spyOn(cognitoService, 'cognitoAdminGetUserByEmail').mockRejectedValue(
        new Error(
          JSON.stringify({
            data: {
              name: 'UserNotFoundException',
            },
          }),
        ),
      );
      await expect(
        UserConfirmResetPasswordService.execute({
          newPassword: 'Password123##',
          confirmPassword: 'Password123##',
          passwordToken: '670a760c7256b2cc6349e568f2b470ba',
        }),
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_NULL',
              message: 'No record found.',
              email: '',
            },
            status: 'success',
            statusCode: 200,
          }),
        ),
      );
    });
    it('should throw an error when cognitoAdminSetUserPassword can not proceed', async () => {
      jest.spyOn(UserValidateResetPasswordService, 'execute').mockResolvedValue({
        token: '123',
        email: 'test@gmail.com',
        tokens: {
          reset_token: {
            expires_at: '2025-01-05 06:30:30',
            reset_at: null,
          },
        },
      });
      jest.spyOn(cognitoService, 'cognitoAdminGetUserByEmail').mockResolvedValue({
        UserAttributes: [{ Name: 'email', Value: 'test@gmail.com' }],
      });
      jest.spyOn(cognitoService, 'cognitoAdminSetUserPassword').mockRejectedValue(
        new Error(
          JSON.stringify({
            status: 'failed',
          }),
        ),
      );
      await expect(
        UserConfirmResetPasswordService.execute({
          newPassword: 'Password123##',
          confirmPassword: 'Password123##',
          passwordToken: '670a760c7256b2cc6349e568f2b470ba',
        }),
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_EMAIL_ERR',
              message: 'Requested email is invalid or empty.',
              email: '',
            },
            status: 'success',
            statusCode: 200,
          }),
        ),
      );
    });
    it('should throw an error when updateByUserEmail can not proceed', async () => {
      jest.spyOn(UserValidateResetPasswordService, 'execute').mockResolvedValue({
        token: '123',
        email: 'test@gmail.com',
        tokens: {
          reset_token: {
            expires_at: '2025-01-05 06:30:30',
            reset_at: null,
          },
        },
      });
      jest.spyOn(cognitoService, 'cognitoAdminGetUserByEmail').mockResolvedValue({
        UserAttributes: [{ Name: 'email', Value: 'test@gmail.com' }],
      });
      jest.spyOn(cognitoService, 'cognitoAdminSetUserPassword').mockResolvedValue({
        status: 'passed',
      });
      jest.spyOn(userCredentialModel, 'updateByUserEmail').mockRejectedValue({
        status: 'failed',
      });
      await expect(
        UserConfirmResetPasswordService.execute({
          newPassword: 'Password123##',
          confirmPassword: 'Password123##',
          passwordToken: '670a760c7256b2cc6349e568f2b470ba',
        }),
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_EMAIL_ERR',
              message: 'Requested email is invalid or empty.',
              email: '',
            },
            status: 'success',
            statusCode: 200,
          }),
        ),
      );
    });
    it('should return success when everything is passed', async () => {
      jest.spyOn(UserValidateResetPasswordService, 'execute').mockResolvedValue({
        token: '123',
        email: 'test@gmail.com',
        tokens: {
          reset_token: {
            expires_at: '2025-01-05 06:30:30',
            reset_at: null,
          },
        },
      });
      jest.spyOn(cognitoService, 'cognitoAdminGetUserByEmail').mockResolvedValue({
        UserAttributes: [{ Name: 'email', Value: 'test@gmail.com' }],
      });
      jest.spyOn(cognitoService, 'cognitoAdminSetUserPassword').mockResolvedValue({
        status: 'passed',
      });
      jest.spyOn(userCredentialModel, 'updateByUserEmail').mockResolvedValue({
        status: 'passed',
      });
      const mockDate = new Date('2024-01-01T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      const rs = await UserConfirmResetPasswordService.execute({
        newPassword: 'Password123##',
        confirmPassword: 'Password123##',
        passwordToken: '670a760c7256b2cc6349e568f2b470ba',
      });
      expect(rs).toEqual({
        membership: {
          code: 200,
          message: 'Password successfully reset.',
          mwgCode: 'MWG_CIAM_USERS_EMAIL_RESET_PASSWORD_SUCCESS',
          passwordToken: '670a760c7256b2cc6349e568f2b470ba',
          resetCompletedAt: new Date('2024-01-01T12:00:00.000Z'),
        },
        status: 'success',
        statusCode: 200,
      });
    });
  });
});
