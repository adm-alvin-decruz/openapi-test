const userGetMembershipPassesJob = require('../../../api/users/userGetMembershipPassesJob');
const userGetMembershipPassesService = require('../../../api/users/userGetMembershipPassesService');

jest.mock('../../../api/users/userGetMembershipPassesService', () => ({
  execute: jest.fn(),
}));

describe('UserGetMembershipPassesJob', () => {
  describe('success', () => {
    it('should return the result passed to success method', () => {
      const rs = userGetMembershipPassesJob.success({
        passes: [
          {
            visualId: '123',
            urls: {
              apple: 'https://example.com/apple',
              google: 'https://example.com/google',
            },
          },
        ],
      });
      expect(rs).toEqual({
        membership: {
          code: 200,
          mwgCode: 'MWG_CIAM_USERS_MY_MEMBERSHIP_SUCCESS',
          message: 'Get my membership success.',
          passes: [
            {
              visualId: '123',
              urls: {
                apple: 'https://example.com/apple',
                google: 'https://example.com/google',
              },
            },
          ],
        },
        status: 'success',
        statusCode: 200,
      });
    });
  });

  describe('perform', () => {
    it('should call failed when there is an errorMessage in the response', async () => {
      jest.spyOn(userGetMembershipPassesService, 'execute').mockRejectedValue(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              message: 'Get my membership failed.',
              mwgCode: 'MWG_CIAM_USERS_MY_MEMBERSHIPS_ERR',
            },
            status: 'success',
            statusCode: 200,
          }),
        ),
      );
      await expect(
        userGetMembershipPassesJob.perform({
          email: 'test@gmail.com',
          visualId: '123',
        }),
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              message: 'Get my membership failed.',
              mwgCode: 'MWG_CIAM_USERS_MY_MEMBERSHIPS_ERR',
            },
            status: 'success',
            statusCode: 200,
          }),
        ),
      );
    });

    it('should call success when the response is valid', async () => {
      jest.spyOn(userGetMembershipPassesService, 'execute').mockResolvedValue({
        passes: [
          {
            visualId: '123',
            urls: {
              apple: 'https://example.com/apple',
              google: 'https://example.com/google',
            },
          },
        ],
      });

      const response = await userGetMembershipPassesJob.perform('12345678');

      expect(response).toEqual({
        membership: {
          code: 200,
          mwgCode: 'MWG_CIAM_USERS_MY_MEMBERSHIP_SUCCESS',
          message: 'Get my membership success.',
          passes: [
            {
              visualId: '123',
              urls: {
                apple: 'https://example.com/apple',
                google: 'https://example.com/google',
              },
            },
          ],
        },
        status: 'success',
        statusCode: 200,
      });
    });
  });
});
