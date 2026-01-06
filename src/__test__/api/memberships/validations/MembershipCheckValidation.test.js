const MembershipCheckValidation = require('../../../../api/memberships/validations/MembershipCheckValidation');

describe('MembershipCheckValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe('execute', () => {
    it('should return error when group is missing', () => {
      const failedMessage = MembershipCheckValidation.execute({});
      expect(failedMessage).toEqual({
        membership: {
          code: 400,
          message: 'Wrong parameters',
          error: {
            group: 'The group is invalid.',
          },
          mwgCode: 'MWG_CIAM_PARAMS_ERR',
        },
        status: 'failed',
        statusCode: 400,
      });
    });
    it('should return error when group is not supported', () => {
      const failedMessage = MembershipCheckValidation.execute({
        email: 'test@gmail.com',
        group: 'invalid-group',
      });
      expect(failedMessage).toEqual({
        membership: {
          code: 400,
          message: 'Wrong parameters',
          error: {
            group: 'The group is invalid.',
          },
          mwgCode: 'MWG_CIAM_PARAMS_ERR',
        },
        status: 'failed',
        statusCode: 400,
      });
    });
    it('should return error when neither email nor mandaiId is provided', () => {
      const failedMessage = MembershipCheckValidation.execute({
        group: 'wildpass',
      });
      expect(failedMessage).toEqual({
        membership: {
          code: 400,
          mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_INVALID_INPUT',
          message: 'Email or Mandai ID is required.',
          email: '',
        },
        status: 'failed',
        statusCode: 400,
      });
    });
    it('should return null when email is provided with valid group', () => {
      const result = MembershipCheckValidation.execute({
        email: 'test@gmail.com',
        group: 'wildpass',
      });
      expect(result).toBeNull();
    });
    it('should return null when mandaiId is provided with valid group', () => {
      const result = MembershipCheckValidation.execute({
        mandaiId: '123',
        group: 'wildpass',
      });
      expect(result).toBeNull();
    });
  });
});
