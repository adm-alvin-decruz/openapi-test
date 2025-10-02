const userValidateResetPasswordJob = require('../../../api/users/userValidateResetPasswordJob');
const userValidateResetPasswordService = require('../../../api/users/userValidateResetPasswordService');

jest.mock('../../../api/users/userValidateResetPasswordService', () => ({
  execute: jest.fn(),
}));

describe('UserValidateResetPasswordJob', () => {
  describe('success', () => {
    it('should return the result passed to success method', () => {
      const rs = userValidateResetPasswordJob.success('123');
      expect(rs).toEqual({
        membership: {
          code: 200,
          mwgCode: 'MWG_CIAM_VALIDATE_PASSWORD_TOKEN_SUCCESS',
          message: 'Token is valid.',
          isValid: true,
          passwordToken: '123',
        },
        status: 'success',
        statusCode: 200,
      });
    });
  });

  describe('perform', () => {
    it('should call failed when there is an errorMessage in the response', async () => {
      jest.spyOn(userValidateResetPasswordService, 'execute').mockRejectedValue(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              message: 'Requested token is invalid or empty.',
              mwgCode: 'MWG_CIAM_VALIDATE_TOKEN_ERR',
            },
            status: 'success',
            statusCode: 200,
          }),
        ),
      );
      await expect(userValidateResetPasswordJob.perform('123')).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              message: 'Requested token is invalid or empty.',
              mwgCode: 'MWG_CIAM_VALIDATE_TOKEN_ERR',
            },
            status: 'success',
            statusCode: 200,
          }),
        ),
      );
    });

    it('should call success when the response is valid', async () => {
      jest
        .spyOn(userValidateResetPasswordService, 'execute')
        .mockResolvedValue({ token: '12345678' });

      const response = await userValidateResetPasswordJob.perform('12345678');

      expect(response).toEqual({
        membership: {
          code: 200,
          mwgCode: 'MWG_CIAM_VALIDATE_PASSWORD_TOKEN_SUCCESS',
          message: 'Token is valid.',
          isValid: true,
          passwordToken: '12345678',
        },
        status: 'success',
        statusCode: 200,
      });
    });
  });
});
