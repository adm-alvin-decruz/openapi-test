const UserGetMembershipPassesService = require('../../../api/users/userGetMembershipPassesService');
const userModel = require('../../../db/models/userModel');
const ApiUtils = require('../../../utils/apiUtils');

jest.mock('../../../db/models/userModel', () => ({
  findByEmailVisualIdsActive: jest.fn(),
  findFullMandaiId: jest.fn(),
}));
jest.mock('../../../utils/apiUtils', () => ({
  makeRequest: jest.fn(),
  handleResponse: jest.fn(),
}));

describe('UserGetMembershipPassesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('execute', () => {
    it('should throw an error when findByEmailVisualIdsActive throw error', async () => {
      jest.spyOn(userModel, 'findByEmailVisualIdsActive').mockRejectedValue('failed query');
      await expect(
        UserGetMembershipPassesService.execute({
          email: 'test@gmail.com',
          visualId: '123',
        }),
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: 'MWG_CIAM_USERS_MY_MEMBERSHIPS_ERR',
              message: 'Get my membership failed.',
            },
            status: 'success',
            statusCode: 200,
          }),
        ),
      );
    });
    it('should throw an error when findFullMandaiId throw error', async () => {
      jest.spyOn(userModel, 'findFullMandaiId').mockRejectedValue('failed query');
      await expect(
        UserGetMembershipPassesService.execute({
          email: 'test@gmail.com',
          list: ['all'],
        }),
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: 'MWG_CIAM_USERS_MY_MEMBERSHIPS_ERR',
              message: 'Get my membership failed.',
            },
            status: 'success',
            statusCode: 200,
          }),
        ),
      );
    });
    it('should return passes based on visualId with case specific visual id', async () => {
      jest.spyOn(userModel, 'findByEmailVisualIdsActive').mockResolvedValue([
        {
          email: 'test@gmail.com',
          mandaiId: '123',
          membership: 'fow',
          visualId: '456',
        },
        {
          email: 'test@gmail.com+1',
          mandaiId: '456',
          membership: 'wildpass',
          visualId: '789',
        },
      ]);
      jest
        .spyOn(ApiUtils, 'makeRequest')
        .mockResolvedValueOnce({
          status: 200,
          data: {
            applePassUrl: 'https://example.com/apple',
            googlePassUrl: 'https://example.com/google',
          },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            applePassUrl: 'https://example.com/apple1',
            googlePassUrl: 'https://example.com/google1',
          },
        });
      jest
        .spyOn(ApiUtils, 'handleResponse')
        .mockReturnValueOnce({
          applePassUrl: 'https://example.com/apple',
          googlePassUrl: 'https://example.com/google',
        })
        .mockReturnValueOnce({
          applePassUrl: 'https://example.com/apple1',
          googlePassUrl: 'https://example.com/google1',
        });
      const rs = await UserGetMembershipPassesService.execute({
        email: 'test@gmail.com',
        visualId: ['456', '789'],
      });
      expect(rs).toEqual({
        passes: [
          {
            visualId: '456',
            urls: {
              apple: 'https://example.com/apple',
              google: 'https://example.com/google',
            },
          },
          {
            visualId: '789',
            urls: {
              apple: 'https://example.com/apple1',
              google: 'https://example.com/google1',
            },
          },
        ],
      });
    });
    it('should return passes based on visualId with case all', async () => {
      jest.spyOn(userModel, 'findFullMandaiId').mockResolvedValue([
        {
          email: 'test@gmail.com',
          mandaiId: '123',
          membership: 'fow',
          visualId: '456',
        },
        {
          email: 'test@gmail.com+1',
          mandaiId: '456',
          membership: 'wildpass',
          visualId: '789',
        },
      ]);
      jest
        .spyOn(ApiUtils, 'makeRequest')
        .mockResolvedValueOnce({
          status: 200,
          data: {
            applePassUrl: 'https://example.com/apple',
            googlePassUrl: 'https://example.com/google',
          },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            applePassUrl: 'https://example.com/apple1',
            googlePassUrl: 'https://example.com/google1',
          },
        });
      jest
        .spyOn(ApiUtils, 'handleResponse')
        .mockReturnValueOnce({
          applePassUrl: 'https://example.com/apple',
          googlePassUrl: 'https://example.com/google',
        })
        .mockReturnValueOnce({
          applePassUrl: 'https://example.com/apple1',
          googlePassUrl: 'https://example.com/google1',
        });
      const rs = await UserGetMembershipPassesService.execute({
        email: 'test@gmail.com',
        list: ['all'],
      });
      expect(rs).toEqual({
        passes: [
          {
            visualId: '456',
            urls: {
              apple: 'https://example.com/apple',
              google: 'https://example.com/google',
            },
          },
          {
            visualId: '789',
            urls: {
              apple: 'https://example.com/apple1',
              google: 'https://example.com/google1',
            },
          },
        ],
      });
    });
    it('should return passes based on visualId and remove some visualId that meet error 400 at passkit', async () => {
      jest.spyOn(userModel, 'findFullMandaiId').mockResolvedValue([
        {
          email: 'test@gmail.com',
          mandaiId: '123',
          membership: 'fow',
          visualId: '456',
        },
        {
          email: 'test@gmail.com+1',
          mandaiId: '456',
          membership: 'wildpass',
          visualId: '789',
        },
      ]);
      jest
        .spyOn(ApiUtils, 'makeRequest')
        .mockResolvedValueOnce({
          status: 200,
          data: {
            applePassUrl: 'https://example.com/apple',
            googlePassUrl: 'https://example.com/google',
          },
        })
        .mockResolvedValueOnce({
          status: 400,
          data: {
            applePassUrl: '',
            googlePassUrl: '',
          },
        });
      jest.spyOn(ApiUtils, 'handleResponse').mockReturnValueOnce({
        applePassUrl: 'https://example.com/apple',
        googlePassUrl: 'https://example.com/google',
      });
      const rs = await UserGetMembershipPassesService.execute({
        email: 'test@gmail.com',
        list: ['all'],
      });
      expect(rs).toEqual({
        passes: [
          {
            visualId: '456',
            urls: {
              apple: 'https://example.com/apple',
              google: 'https://example.com/google',
            },
          },
        ],
      });
    });
    it('should return passes based on visualId and remove some visualId not found result - 404 at passkit', async () => {
      jest.spyOn(userModel, 'findFullMandaiId').mockResolvedValue([
        {
          email: 'test@gmail.com',
          mandaiId: '123',
          membership: 'fow',
          visualId: '456',
        },
        {
          email: 'test@gmail.com+1',
          mandaiId: '456',
          membership: 'wildpass',
          visualId: '789',
        },
      ]);
      jest
        .spyOn(ApiUtils, 'makeRequest')
        .mockResolvedValueOnce({
          status: 200,
          data: {
            applePassUrl: 'https://example.com/apple',
            googlePassUrl: 'https://example.com/google',
          },
        })
        .mockResolvedValueOnce({
          status: 404,
          data: {
            applePassUrl: '',
            googlePassUrl: '',
          },
        });
      jest
        .spyOn(ApiUtils, 'handleResponse')
        .mockReturnValueOnce({
          applePassUrl: 'https://example.com/apple',
          googlePassUrl: 'https://example.com/google',
        })
        .mockReturnValueOnce({
          applePassUrl: '',
          googlePassUrl: '',
        });
      const rs = await UserGetMembershipPassesService.execute({
        email: 'test@gmail.com',
        list: ['all'],
      });
      expect(rs).toEqual({
        passes: [
          {
            visualId: '456',
            urls: {
              apple: 'https://example.com/apple',
              google: 'https://example.com/google',
            },
          },
          {
            visualId: '789',
            urls: {
              apple: '',
              google: '',
            },
          },
        ],
      });
    });
  });
});
