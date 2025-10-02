const usersService = require('../../../api/users/usersServices');
const cognitoService = require('../../../services/cognitoService');
const userCredentialModel = require('../../../db/models/userCredentialModel');
const userLoginServices = require('../../../api/users/userLoginServices');

jest.mock('../../../api/users/usersServices', () => ({
  genSecretHash: jest.fn(),
}));
jest.mock('../../../services/cognitoService', () => ({
  cognitoUserLogin: jest.fn(),
  cognitoAdminGetUserByEmail: jest.fn(),
}));
jest.mock('../../../db/models/userCredentialModel', () => ({
  updateTokens: jest.fn(),
  findByUserEmail: jest.fn(),
}));

describe('UserLoginService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe('login', () => {
    it('should throw an error when failed login Cognito', async () => {
      jest.spyOn(usersService, 'genSecretHash').mockReturnValue('example-hash-secret');
      jest.spyOn(cognitoService, 'cognitoUserLogin').mockRejectedValue({
        status: 'failed',
      });
      await expect(
        userLoginServices.login({
          body: {
            email: 'test@gmail.com',
            password: '123',
          },
        }),
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 401,
              mwgCode: 'MWG_CIAM_UNAUTHORIZED',
              message: 'Unauthorized',
            },
            status: 'failed',
            statusCode: 401,
          }),
        ),
      );
      expect(usersService.genSecretHash).toBeCalledTimes(1);
    });
    it('should return login session when login cognito success', async () => {
      jest.spyOn(usersService, 'genSecretHash');
      jest.spyOn(cognitoService, 'cognitoUserLogin').mockResolvedValue({
        UserAttributes: [
          {
            Name: 'email',
            Value: 'test@gmail.com',
          },
        ],
      });
      const rs = await userLoginServices.login({
        body: {
          email: 'test@gmail.com',
          password: '123',
        },
      });
      expect(rs).toEqual({
        UserAttributes: [
          {
            Name: 'email',
            Value: 'test@gmail.com',
          },
        ],
      });
      expect(usersService.genSecretHash).toBeCalledTimes(1);
    });
  });
  describe('getUser', () => {
    it('should throw an error when user not found in Cognito', async () => {
      jest.spyOn(cognitoService, 'cognitoAdminGetUserByEmail').mockRejectedValue({
        status: 'failed',
      });
      await expect(
        userLoginServices.getUser({
          body: {
            email: 'test@gmail.com',
            password: '123',
          },
        }),
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_NULL',
              message: 'No record found.',
              email: 'test@gmail.com',
            },
            status: 'success',
            statusCode: 200,
          }),
        ),
      );
    });
    it('should throw an error when user not found in db', async () => {
      jest.spyOn(cognitoService, 'cognitoAdminGetUserByEmail').mockResolvedValue({
        UserAttributes: [
          {
            Name: 'email',
            Value: 'test@gmail.com',
          },
        ],
      });
      jest.spyOn(userCredentialModel, 'findByUserEmail').mockResolvedValue(undefined);
      await expect(
        userLoginServices.getUser({
          body: {
            email: 'test@gmail.com',
            password: '123',
          },
        }),
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_NULL',
              message: 'No record found.',
              email: 'test@gmail.com',
            },
            status: 'success',
            statusCode: 200,
          }),
        ),
      );
    });
    it('return user info when user exists', async () => {
      jest.spyOn(cognitoService, 'cognitoAdminGetUserByEmail').mockResolvedValue({
        UserAttributes: [
          { Name: 'email', Value: 'test-user@gmail.com' },
          { Name: 'custom:mandai_id', Value: '2' },
        ],
      });
      jest.spyOn(userCredentialModel, 'findByUserEmail').mockResolvedValue({
        user_id: '1',
      });
      const rs = await userLoginServices.getUser({
        body: {
          email: 'test-user@gmail.com',
          password: '123',
        },
      });
      expect(rs).toEqual({
        email: 'test-user@gmail.com',
        mandaiId: '2',
        userId: '1',
      });
    });
  });
  describe('updateUser', () => {
    it('should throw an error when update process failed', async () => {
      jest.spyOn(userCredentialModel, 'updateTokens').mockRejectedValue('update db failed');
      await expect(
        userLoginServices.updateUser(1, {
          accessToken: 'example-token',
          refreshToken: 'refresh-token',
          idToken: 'id-token',
        }),
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 500,
              mwgCode: 'MWG_CIAM_INTERNAL_SERVER_ERROR',
              message: 'Internal Server Error',
            },
            status: 'failed',
            statusCode: 500,
          }),
        ),
      );
      expect(userCredentialModel.updateTokens).toBeCalledTimes(1);
    });
  });
  describe('execute', () => {
    it('throw error when getUser failed', async () => {
      jest.spyOn(cognitoService, 'cognitoAdminGetUserByEmail').mockRejectedValue({
        status: 'failed',
      });
      await expect(
        userLoginServices.execute({
          body: {
            email: 'test@gmail.com',
            password: '123',
          },
        }),
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_NULL',
              message: 'No record found.',
              email: 'test@gmail.com',
            },
            status: 'success',
            statusCode: 200,
          }),
        ),
      );
    });
    it('throw error when login failed', async () => {
      jest.spyOn(userLoginServices, 'getUser').mockImplementationOnce(() => {
        return {
          email: 'test@gmail.com',
          mandaiId: '1',
          userId: '2',
        };
      });
      jest
        .spyOn(cognitoService, 'cognitoUserLogin')
        .mockRejectedValue(new Error(JSON.stringify({ status: 'failed' })));
      await expect(
        userLoginServices.execute({
          body: {
            email: 'test-email@gmail.com',
            password: '123',
          },
        }),
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 401,
              mwgCode: 'MWG_CIAM_UNAUTHORIZED',
              message: 'Unauthorized',
            },
            status: 'failed',
            statusCode: 401,
          }),
        ),
      );
    });
    it('throw error when updateUser failed', async () => {
      jest.spyOn(userLoginServices, 'getUser').mockImplementationOnce(() => {
        return {
          email: 'test@gmail.com',
          mandaiId: '1',
          userId: '2',
        };
      });
      jest.spyOn(userLoginServices, 'login').mockImplementationOnce(() => {
        return {
          accessToken: 'test-access',
        };
      });
      jest.spyOn(userCredentialModel, 'updateTokens').mockRejectedValue('update db failed');
      await expect(
        userLoginServices.execute({
          body: {
            email: 'test-email@gmail.com',
            password: '123',
          },
        }),
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 500,
              mwgCode: 'MWG_CIAM_INTERNAL_SERVER_ERROR',
              message: 'Internal Server Error',
            },
            status: 'failed',
            statusCode: 500,
          }),
        ),
      );
    });
    it('should return user when execute process success', async () => {
      jest.spyOn(userLoginServices, 'getUser').mockImplementationOnce(() => {
        return {
          email: 'test@gmail.com',
          mandaiId: '1',
          userId: '2',
        };
      });
      jest.spyOn(userLoginServices, 'login').mockImplementationOnce(() => {
        return {
          accessToken: 'test-access',
        };
      });
      jest.spyOn(userCredentialModel, 'updateTokens').mockResolvedValue('update db success');
      const rs = await userLoginServices.execute({
        body: {
          email: 'test-email@gmail.com',
          password: '123',
        },
      });
      expect(rs).toEqual({
        accessToken: 'test-access',
        mandaiId: '1',
        email: 'test@gmail.com',
      });
    });
  });
});
