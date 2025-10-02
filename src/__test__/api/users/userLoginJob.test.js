const userLoginJob = require('../../../api/users/userLoginJob');
const UserLoginService = require('../../../api/users/userLoginServices');

jest.mock('../../../api/users/userLoginServices', () => ({
  execute: jest.fn(),
}));

describe('UserLoginJob', () => {
  describe('success', () => {
    it('should return the result passed to success method', () => {
      const result = {
        mandaiId: 1,
        accessToken: 'test',
        email: 'test@gmail.com',
      };
      const rs = userLoginJob.success(result);
      expect(rs).toEqual({
        membership: {
          code: 200,
          mwgCode: 'MWG_CIAM_USERS_LOGIN_SUCCESS',
          message: 'Login success.',
          accessToken: 'test',
          mandaiId: 1,
          email: 'test@gmail.com',
          callbackURL: 'https://uat-www.mandai.com/bin/wrs/ciam/auth/callback',
        },
        status: 'success',
        statusCode: 200,
      });
    });
  });

  describe('perform', () => {
    it('should call failed when service login execute failed', async () => {
      jest.spyOn(UserLoginService, 'execute').mockRejectedValue(
        new Error(
          JSON.stringify({
            membership: {
              code: 501,
              mwgCode: 'MWG_CIAM_NOT_IMPLEMENTED',
              message: 'Not implemented',
            },
            status: 'failed',
            statusCode: 501,
          }),
        ),
      );

      await expect(
        userLoginJob.perform({
          body: {
            email: 'test-user',
            password: 'password',
          },
        }),
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 501,
              mwgCode: 'MWG_CIAM_NOT_IMPLEMENTED',
              message: 'Not implemented',
            },
            status: 'failed',
            statusCode: 501,
          }),
        ),
      );
    });

    it('should return success when service login execute pass', async () => {
      jest.spyOn(UserLoginService, 'execute').mockResolvedValue({
        accessToken: 'test-access',
        mandaiId: 'example-id',
        email: 'test@gmail.com',
      });
      const response = await userLoginJob.perform({
        body: {
          email: 'test@gmail.com',
          password: 'password',
        },
      });

      expect(response).toEqual({
        membership: {
          code: 200,
          mwgCode: 'MWG_CIAM_USERS_LOGIN_SUCCESS',
          message: 'Login success.',
          accessToken: 'test-access',
          mandaiId: 'example-id',
          email: 'test@gmail.com',
          callbackURL: 'https://uat-www.mandai.com/bin/wrs/ciam/auth/callback',
        },
        status: 'success',
        statusCode: 200,
      });
    });
  });
});
