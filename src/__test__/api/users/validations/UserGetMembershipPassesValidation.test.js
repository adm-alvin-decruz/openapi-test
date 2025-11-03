const UserGetMembershipPassesValidation = require('../../../../api/users/validations/UserGetMembershipPassesValidation');

describe('UserGetMembershipPassesValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe('execute', () => {
    it('should throw an error when visual exists but empty string', () => {
      const failedMessage = UserGetMembershipPassesValidation.execute({
        visualId: '',
      });
      expect(failedMessage).toEqual({
        membership: {
          code: 400,
          mwgCode: 'MWG_CIAM_PARAMS_ERR',
          message: 'Wrong parameters',
          error: {
            visualId: 'Visual id is invalid',
          },
        },
        status: 'failed',
        statusCode: 400,
      });
    });
    it('should throw an error when visual exists but empty string - multiple language', () => {
      const failedMessage = UserGetMembershipPassesValidation.execute({
        visualId: '',
        language: 'kr',
      });
      expect(failedMessage).toEqual({
        membership: {
          code: 400,
          mwgCode: 'MWG_CIAM_PARAMS_ERR',
          message: 'Wrong parameters',
          error: {
            visualId: '시각 ID가 유효하지 않습니다',
          },
        },
        status: 'failed',
        statusCode: 400,
      });
    });
  });
});
