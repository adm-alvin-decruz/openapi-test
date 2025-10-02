const UserVerifyTokenService = require('../../../api/users/UserVerifyTokenService');
const cognitoService = require('../../../services/cognitoService');
const { CognitoJwtVerifier } = require('aws-jwt-verify');

jest.mock('aws-jwt-verify', () => {
  return {
    CognitoJwtVerifier: {
      create: jest.fn(),
    },
  };
});

jest.mock('../../../services/cognitoService', () => ({
  cognitoAdminGetUserByAccessToken: jest.fn(),
}));

describe('UserVerifyTokenService', () => {
  const mockVerifier = {
    verify: jest.fn(),
  };
  beforeEach(() => {
    jest.clearAllMocks();
    CognitoJwtVerifier.create.mockReturnValue(mockVerifier);
    // jest.clearAllMocks();
  });

  afterEach(() => {
    // jest.restoreAllMocks();
  });

  describe('VerifyToken', () => {
    it('should throw an error when accessToken is expired from cognito inquiry', async () => {
      jest.spyOn(cognitoService, 'cognitoAdminGetUserByAccessToken').mockRejectedValue(
        new Error(
          JSON.stringify({
            status: 401,
            data: 'failed',
            rawError: 'NotAuthorizedException: Access Token has expired',
          }),
        ),
      );
      await expect(UserVerifyTokenService.verifyToken('123', 'test@gmail.com')).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              valid: false,
              expired_at: null,
            },
            status: 'failed',
            statusCode: 200,
          }),
        ),
      );
    });
    it('should response accessToken valid false when accessToken is valid but different email from cognito inquiry', async () => {
      jest.spyOn(cognitoService, 'cognitoAdminGetUserByAccessToken').mockResolvedValue({
        UserAttributes: [
          {
            Name: 'email',
            Value: 'tesg@gmail.com',
          },
        ],
      });
      const rs = await UserVerifyTokenService.verifyToken('123', 'test@gmail.com');
      expect(rs).toEqual({
        membership: {
          code: 200,
          valid: false,
          expired_at: null,
        },
        status: 'failed',
        statusCode: 200,
      });
    });
    it('should response accessToken status based on email', async () => {
      jest.spyOn(cognitoService, 'cognitoAdminGetUserByAccessToken').mockResolvedValue({
        UserAttributes: [
          {
            Name: 'email',
            Value: 'test@gmail.com',
          },
        ],
      });
      mockVerifier.verify.mockResolvedValue({
        username: 'test@gmail.com',
        exp: 1736420606,
      });
      const rs = await UserVerifyTokenService.verifyToken('123', {
        email: 'test@gmail.com',
      });
      expect(mockVerifier.verify).toHaveBeenCalledWith('123');
      expect(rs).toEqual({
        token: {
          code: 200,
          valid: true,
          expired_at: '2025-01-09 11:03:26',
          email: 'test@gmail.com',
        },
        status: 'success',
        statusCode: 200,
      });
    });
    it('should response accessToken status based on mandaiId', async () => {
      jest.spyOn(cognitoService, 'cognitoAdminGetUserByAccessToken').mockResolvedValue({
        UserAttributes: [
          {
            Name: 'email',
            Value: 'test@gmail.com',
          },
          {
            Name: 'custom:mandai_id',
            Value: '123',
          },
        ],
      });
      mockVerifier.verify.mockResolvedValue({
        username: 'test@gmail.com',
        exp: 1736420606,
      });
      const rs = await UserVerifyTokenService.verifyToken('123', {
        mandaiId: '123',
      });
      expect(mockVerifier.verify).toHaveBeenCalledWith('123');
      expect(rs).toEqual({
        token: {
          code: 200,
          valid: true,
          expired_at: '2025-01-09 11:03:26',
          mandaiId: '123',
        },
        status: 'success',
        statusCode: 200,
      });
    });
    it('should throw error when email and mandaiId is empty', async () => {
      jest.spyOn(cognitoService, 'cognitoAdminGetUserByAccessToken').mockResolvedValue({
        UserAttributes: [
          {
            Name: 'email',
            Value: 'test@gmail.com',
          },
        ],
      });
      mockVerifier.verify.mockResolvedValue({
        username: 'test@gmail.com',
        exp: 1736420606,
      });
      const rs = await UserVerifyTokenService.verifyToken('123', {
        email: '',
        mandaiId: '',
      });
      expect(rs).toEqual({
        membership: {
          code: 200,
          valid: false,
          expired_at: null,
        },
        status: 'failed',
        statusCode: 200,
      });
    });
  });
});
