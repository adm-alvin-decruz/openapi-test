const UserValidateResetPasswordService = require('../../../api/users/userValidateResetPasswordService');
const userCredentialModel = require('../../../db/models/userCredentialModel');
const DateUtils = require('../../../utils/dateUtils');

jest.mock('../../../db/models/userCredentialModel', () => ({
  findByPasswordHash: jest.fn(),
}));
jest.mock('../../../utils/dateUtils', () => ({
  getCurrentUTCTimestamp: jest.fn(),
}));

describe('UserResetValidatePasswordService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('execute', () => {
    it('should throw an error when user not found by password_hash', async () => {
      jest.spyOn(userCredentialModel, 'findByPasswordHash').mockResolvedValue(undefined);
      await expect(UserValidateResetPasswordService.execute('123')).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 401,
              mwgCode: 'MWG_CIAM_VALIDATE_TOKEN_ERR',
              message: 'Requested token is invalid or empty.',
            },
            status: 'failed',
            statusCode: 401,
          }),
        ),
      );
    });
    it('should throw an error when token is expired', async () => {
      jest.spyOn(userCredentialModel, 'findByPasswordHash').mockResolvedValue({
        tokens: {
          reset_token: {
            expires_at: '2025-01-05 06:30:30',
          },
        },
        username: 'test@gmail.com',
      });
      jest.spyOn(DateUtils, 'getCurrentUTCTimestamp').mockReturnValueOnce('2025-01-05 07:30:30');
      await expect(UserValidateResetPasswordService.execute('123')).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 401,
              mwgCode: 'MWG_CIAM_VALIDATE_TOKEN_EXPIRED',
              message: 'Requested token has expired.',
            },
            status: 'failed',
            statusCode: 401,
          }),
        ),
      );
    });
    it('should throw an error when token without expires_at', async () => {
      jest.spyOn(userCredentialModel, 'findByPasswordHash').mockResolvedValue({
        tokens: {
          accessToken: 'abcde12345',
        },
        username: 'test@gmail.com',
      });
      await expect(UserValidateResetPasswordService.execute('123')).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 401,
              mwgCode: 'MWG_CIAM_VALIDATE_TOKEN_ERR',
              message: 'Requested token is invalid or empty.',
            },
            status: 'failed',
            statusCode: 401,
          }),
        ),
      );
    });
    it('should throw an error when token has been used', async () => {
      jest.spyOn(userCredentialModel, 'findByPasswordHash').mockResolvedValue({
        tokens: {
          reset_token: {
            reset_at: '2024-06-01 12:30:30',
            expires_at: '2024-06-01 01:01:01',
          },
        },
        username: 'test@gmail.com',
      });
      await expect(UserValidateResetPasswordService.execute('123')).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 401,
              mwgCode: 'MWG_CIAM_PASSWORD_ERR_03',
              message: 'Token has already been used.',
            },
            status: 'failed',
            statusCode: 401,
          }),
        ),
      );
    });
    it('should return token & email when all process is passed', async () => {
      jest.spyOn(userCredentialModel, 'findByPasswordHash').mockResolvedValue({
        tokens: {
          reset_token: {
            expires_at: '2025-01-05 06:30:30',
            reset_at: null,
          },
        },
        username: 'test@gmail.com',
      });
      jest.spyOn(DateUtils, 'getCurrentUTCTimestamp').mockReturnValueOnce('2025-01-04 06:30:30');
      const rs = await UserValidateResetPasswordService.execute('123');

      await expect(rs).toEqual({
        token: '123',
        email: 'test@gmail.com',
        tokens: {
          reset_token: {
            expires_at: '2025-01-05 06:30:30',
            reset_at: null,
          },
        },
      });
    });
  });
});
