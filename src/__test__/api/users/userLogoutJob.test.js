const userLogoutJob = require('../../../api/users/userLogoutJob');
const UserLogoutService = require('../../../api/users/userLogoutServices');

jest.mock('../../../api/users/userLogoutServices', () => ({
  execute: jest.fn(),
}));

describe('UserLogoutJob', () => {
  describe('success', () => {
    it('should return the result passed to success method', () => {
      const rs = userLogoutJob.success('test@gmail.com');
      expect(rs).toEqual({
        membership: {
          code: 200,
          mwgCode: 'MWG_CIAM_USERS_LOGOUT_SUCCESS',
          message: 'Logout success.',
          email: 'test@gmail.com',
        },
        status: 'success',
        statusCode: 200,
      });
    });
  });

  describe('perform', () => {
    it('should call failed when there is an errorMessage in the response', async () => {
      jest.spyOn(UserLogoutService, 'execute').mockRejectedValue(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_NULL',
              message: 'No record found.',
            },
            status: 'success',
            statusCode: 200,
          }),
        ),
      );
      await expect(userLogoutJob.perform('123')).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_NULL',
              message: 'No record found.',
            },
            status: 'success',
            statusCode: 200,
          }),
        ),
      );
    });

    it('should call success when the response is valid', async () => {
      jest.spyOn(UserLogoutService, 'execute').mockResolvedValue({ email: 'test@gmail.com' });

      const response = await userLogoutJob.perform('123');

      expect(response).toEqual({
        membership: {
          code: 200,
          mwgCode: 'MWG_CIAM_USERS_LOGOUT_SUCCESS',
          message: 'Logout success.',
          email: 'test@gmail.com',
        },
        status: 'success',
        statusCode: 200,
      });
    });
  });
});
