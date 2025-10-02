const userSignupJob = require('../../../api/users/userSignupJob');
const UserSignupService = require('../../../api/users/userSignupService');

jest.mock('../../../api/users/userSignupService', () => ({
  signup: jest.fn(),
}));

describe('UserSignupJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should call UserSignupService.signup', async () => {
      const req = {
        body: {
          email: 'test-user',
          password: 'password',
        },
      };
      await userSignupJob.execute(req);
      expect(UserSignupService.signup).toHaveBeenCalledWith(req);
    });
  });

  describe('perform', () => {
    it('should throw error when execute failed', async () => {
      const req = {
        body: {
          email: 'test-user',
          password: 'password',
        },
      };

      jest.spyOn(userSignupJob, 'execute').mockRejectedValue(
        new Error(
          JSON.stringify({
            statusCode: 400,
          }),
        ),
      );

      await expect(userSignupJob.perform(req)).rejects.toThrow('{"statusCode":400}');
    });

    it('should call success when execute passed', async () => {
      const req = {
        body: {
          email: 'test-user',
          password: 'password',
        },
      };
      const result = {
        membership: {
          code: 200,
          mandaiId: '123',
          message: 'New user signed up successfully.',
          mwgCode: 'MWG_CIAM_USER_SIGNUP_SUCCESS',
        },
        status: 'success',
        statusCode: 200,
      };

      jest.spyOn(userSignupJob, 'execute').mockResolvedValue({ mandaiId: '123' });

      const response = await userSignupJob.perform(req);

      expect(response).toEqual(result);
    });
  });
});
