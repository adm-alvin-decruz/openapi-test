const cognitoService = require('../../../services/cognitoService');
const userSignupService = require('../../../api/users/userSignupService');
const pool = require('../../../db/connections/mysqlConn');
const failedJobsModel = require('../../../db/models/failedJobsModel');
const userModel = require('../../../db/models/userModel');

jest.mock('../../../db/models/failedJobsModel', () => ({
  create: jest.fn(),
}));
jest.mock('../../../db/models/userModel', () => ({
  create: jest.fn(),
}));
jest.mock('../../../services/cognitoService', () => ({
  cognitoAdminGetUserByEmail: jest.fn(),
  cognitoAdminCreateUser: jest.fn(),
  cognitoAdminSetUserPassword: jest.fn(),
  cognitoAdminAddUserToGroup: jest.fn(),
}));
jest.mock('../../../db/connections/mysqlConn', () => ({
  transaction: jest.fn(),
}));
jest.mock('../../../db/models/userModel', () => ({
  create: jest.fn(),
}));

describe('UserSignupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isUserExistedInCognito', () => {
    it('should throw an error when failed get user info Cognito', async () => {
      jest.spyOn(cognitoService, 'cognitoAdminGetUserByEmail').mockRejectedValue(
        new Error(
          JSON.stringify({
            status: 'failed',
          }),
        ),
      );
      await expect(
        userSignupService.isUserExistedInCognito({
          body: {
            email: 'example-email@gmail.com',
            password: '123',
          },
        }),
      ).rejects.toThrow(
        '{"membership":{"code":501,"mwgCode":"MWG_CIAM_NOT_IMPLEMENTED","message":"Not implemented"},"status":"failed","statusCode":501}',
      );
    });
    it('should return false when get user info Cognito not found', async () => {
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
        userSignupService.isUserExistedInCognito({
          body: {
            email: 'example-email@gmail.com',
            password: '123',
          },
        }),
      ).resolves.toBe(false);
    });
    it('should return mandaId when get user info Cognito has found', async () => {
      jest.spyOn(cognitoService, 'cognitoAdminGetUserByEmail').mockResolvedValue({
        UserAttributes: [{ Name: 'custom:mandai_id', Value: '123' }],
      });
      const rs = await userSignupService.isUserExistedInCognito('test@gmail.com');
      expect(rs).toEqual('123');
    });
  });
  describe('generateMandaiId', () => {
    it('should generate mandaiID for fow', async () => {
      const mandaiId = userSignupService.generateMandaiId({
        headers: {
          'mwg-app-id': '123',
        },
        body: {
          group: 'membership-passes',
        },
      });
      expect(mandaiId).toContain('MMPGA');
    });
    it('should generate mandaiID for fow+', async () => {
      const mandaiId = userSignupService.generateMandaiId({
        headers: {
          'mwg-app-id': '123',
        },
        body: {
          group: 'wildpass',
        },
      });
      expect(mandaiId).toContain('MWPGA');
    });
  });
  describe('saveUserDB', () => {
    it('should throw error when meet failed transaction', async () => {
      jest.spyOn(pool, 'transaction').mockRejectedValue('rollback');
      jest.spyOn(userModel, 'create').mockRejectedValue('failed');
      await userSignupService.saveUserDB({
        req: {
          headers: {
            'mwg-app-id': '123',
          },
          body: {
            email: 'test@gmail.com',
          },
        },
        mandaiId: '123',
        hashPassword: '123',
      });
      expect(failedJobsModel.create).toHaveBeenCalled();
    });
  });
  describe('signup', () => {
    it('should throw error when email is existed', async () => {
      jest.spyOn(userSignupService, 'isUserExistedInCognito').mockImplementationOnce(() => '123');
      await expect(
        userSignupService.signup({
          body: {
            email: 'test@gmail.com',
          },
        }),
      ).rejects.toThrow(
        JSON.stringify({
          membership: {
            code: 200,
            mwgCode: 'MWG_CIAM_USER_SIGNUP_ERR',
            message: 'This email address is already being used for a Mandai Account.',
          },
          status: 'success',
          statusCode: 200,
        }),
      );
    });
    it('should throw error when cognitoAdminCreateUser is failed', async () => {
      jest.spyOn(userSignupService, 'isUserExistedInCognito').mockImplementationOnce(() => false);
      jest.spyOn(cognitoService, 'cognitoAdminCreateUser').mockRejectedValue(
        new Error(
          JSON.stringify({
            status: 'failed',
          }),
        ),
      );
      await expect(
        userSignupService.signup({
          headers: {
            'mwg-app-id': 123,
          },
          body: {
            email: 'test@gmail.com',
            password: '123',
            group: 'membership-passes',
          },
        }),
      ).rejects.toThrow(
        JSON.stringify({
          membership: {
            code: 200,
            mwgCode: 'MWG_CIAM_USER_SIGNUP_ERR',
            message: 'New user signup error.',
          },
          status: 'success',
          statusCode: 200,
        }),
      );
    });
    it('should throw error when cognitoAdminSetUserPassword is failed', async () => {
      jest.spyOn(userSignupService, 'isUserExistedInCognito').mockImplementationOnce(() => false);
      jest.spyOn(cognitoService, 'cognitoAdminCreateUser').mockResolvedValue({ status: 'success' });
      jest.spyOn(cognitoService, 'cognitoAdminSetUserPassword').mockRejectedValue(
        new Error(
          JSON.stringify({
            status: 'failed',
          }),
        ),
      );
      await expect(
        userSignupService.signup({
          headers: {
            'mwg-app-id': 123,
          },
          body: {
            email: 'test@gmail.com',
            password: '123',
            group: 'membership-passes',
          },
        }),
      ).rejects.toThrow(
        JSON.stringify({
          membership: {
            code: 200,
            mwgCode: 'MWG_CIAM_USER_SIGNUP_ERR',
            message: 'New user signup error.',
          },
          status: 'success',
          statusCode: 200,
        }),
      );
    });
    it('should return mandaiId when signup success', async () => {
      jest.spyOn(userSignupService, 'isUserExistedInCognito').mockImplementationOnce(() => false);
      jest.spyOn(cognitoService, 'cognitoAdminCreateUser').mockResolvedValue({ status: 'success' });
      jest
        .spyOn(cognitoService, 'cognitoAdminSetUserPassword')
        .mockResolvedValue({ status: 'success' });
      jest
        .spyOn(cognitoService, 'cognitoAdminAddUserToGroup')
        .mockResolvedValue({ status: 'success' });
      jest.spyOn(userSignupService, 'saveUserDB').mockImplementationOnce(() => Promise.resolve());
      jest.spyOn(userSignupService, 'generateMandaiId').mockImplementationOnce(() => '123');
      const rs = await userSignupService.signup({
        headers: {
          'mwg-app-id': 123,
        },
        body: {
          email: 'test@gmail.com',
          password: '123',
          group: 'membership-passes',
        },
      });
      expect(rs).toEqual({ mandaiId: '123' });
    });
  });
});
