const SupportUserServices = require('../../../api/supports/supportUserServices');
const supportDBService = require('../../../api/supports/supportDBServices');
const supportCognitoService = require('../../../api/supports/supportCognitoServices');
const DataPatcher = require('../../../api/supports/dataPatcher');
const userConfig = require('../../../config/usersConfig');

// Mock dependencies
jest.mock('../../../api/supports/supportDBServices');
jest.mock('../../../api/supports/supportCognitoServices');
jest.mock('../../../api/supports/dataPatcher');
jest.mock('../../../config/usersConfig');

describe('SupportUserServices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Mock console.log
    console.error = jest.fn(); // Mock console.error
  });

  describe('getUserAllInfoService', () => {
    it('should return combined user info from DB and Cognito', async () => {
      const req = { body: { email: 'test@example.com' } };
      const dbInfo = { id: 1, name: 'Test User' };
      const cognitoInfo = { sub: 'abc123', email_verified: true };

      supportDBService.getUserFullInfoByEmail.mockResolvedValue(dbInfo);
      supportCognitoService.getUserCognitoInfo.mockResolvedValue(cognitoInfo);

      const result = await SupportUserServices.getUserAllInfoService(req);

      expect(result).toEqual({
        db: dbInfo,
        cognito: cognitoInfo,
      });
      expect(supportDBService.getUserFullInfoByEmail).toHaveBeenCalledWith(req);
      expect(supportCognitoService.getUserCognitoInfo).toHaveBeenCalledWith(req);
      expect(console.log).toHaveBeenCalledWith(result);
    });
  });

  describe('getUsersPaginationCustomService', () => {
    it('should return paginated user data', async () => {
      const req = { body: { page: 1, limit: 10 } };
      const paginatedData = {
        users: [
          { id: 1, name: 'User 1' },
          { id: 2, name: 'User 2' },
        ],
        totalCount: 100,
      };

      supportDBService.getUserPageCustomField.mockResolvedValue(paginatedData);

      const result = await SupportUserServices.getUsersPaginationCustomService(req);

      expect(result).toEqual(paginatedData);
      expect(supportDBService.getUserPageCustomField).toHaveBeenCalledWith(req);
      expect(console.log).toHaveBeenCalledWith(
        'SupportUserServices getUsersPaginationCustomService',
        paginatedData,
      );
    });
  });

  describe('batchPatchUserService', () => {
    it('should patch user data with provided limit', async () => {
      const req = {
        body: {
          limit: 5,
          // other patch data
        },
      };
      const affectedEmails = ['user1@example.com', 'user2@example.com'];

      userConfig.DEFAULT_PAGE_SIZE = 10;
      const mockPatchData = jest.fn().mockResolvedValue(affectedEmails);
      DataPatcher.mockImplementation(() => ({
        patchData: mockPatchData,
      }));

      const result = await SupportUserServices.batchPatchUserService(req);

      expect(result).toEqual(affectedEmails);
      expect(mockPatchData).toHaveBeenCalledWith(expect.objectContaining({ limit: 5 }));
      expect(console.log).toHaveBeenCalledWith('Patching completed');
      expect(console.log).toHaveBeenCalledWith('Affected emails:', affectedEmails);
    });

    it('should use default page size if limit is not provided', async () => {
      const req = {
        body: {
          // no limit provided
        },
      };
      const affectedEmails = ['user1@example.com', 'user2@example.com'];

      userConfig.DEFAULT_PAGE_SIZE = 10;
      const mockPatchData = jest.fn().mockResolvedValue(affectedEmails);
      DataPatcher.mockImplementation(() => ({
        patchData: mockPatchData,
      }));

      await SupportUserServices.batchPatchUserService(req);

      expect(mockPatchData).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }));
    });

    it('should handle errors during patching', async () => {
      const req = {
        body: {
          limit: 5,
        },
      };
      const error = new Error('Patching failed');

      userConfig.DEFAULT_PAGE_SIZE = 10;
      const mockPatchData = jest.fn().mockRejectedValue(error);
      DataPatcher.mockImplementation(() => ({
        patchData: mockPatchData,
      }));

      await SupportUserServices.batchPatchUserService(req);

      expect(console.error).toHaveBeenCalledWith('Error during patching:', error);
    });
  });
});
