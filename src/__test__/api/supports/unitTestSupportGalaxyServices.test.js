const supportGalaxyServices = require('../../../api/supports/supportGalaxyServices');
const galaxyWPService = require('../../../api/components/galaxy/services/galaxyWPService');
const supportDBService = require('../../../api/supports/supportDBServices');
const userDBService = require('../../../api/users/usersDBService');
const commonService = require('../../../services/commonService');
const loggerService = require('../../../logs/logger');

// Mock dependencies
jest.mock('../../../api/components/galaxy/services/galaxyWPService');
jest.mock('../../../api/supports/supportDBServices');
jest.mock('../../../api/users/usersDBService');
jest.mock('../../../services/commonService');
jest.mock('../../../logs/logger');

describe('supportGalaxyServices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should call the specified method if it exists', async () => {
      const mockMethod = jest.spyOn(supportGalaxyServices, 'triggerGalaxyImportSvc').mockResolvedValue('result');
      const result = await supportGalaxyServices.execute('triggerGalaxyImportSvc', {});
      expect(result).toBe('result');
      expect(mockMethod).toHaveBeenCalledWith({});
    });

    it('should throw an error if the method does not exist', async () => {
      await expect(supportGalaxyServices.execute('nonExistentMethod')).rejects.toThrow('Method nonExistentMethod not found');
    });
  });

  describe('triggerGalaxyImportSvc', () => {
    it('should handle manual type request', async () => {
      const req = {
        body: {
          "type": "manual", // manual
          "action": "userSignup",
          "accounts":[{
                 "email": "kwanoun.liong@mandai.com",
                "firstName": "Kay",
                "lastName": "Liong",
                "dob": "22/09/1966",
                "group": "wildpass",
                "newsletter": {"type": "1", "name": "wildpass", "subscribe": true}
          }]
      }
      };
      commonService.valJsonObjOrArray.mockReturnValue(true);
      supportGalaxyServices.retriggerGalaxyTask = jest.fn().mockResolvedValue({ sqs: 'success', db: 'success' });

      const result = await supportGalaxyServices.triggerGalaxyImportSvc(req);

      expect(result).toEqual([{ sqs: 'success', db: 'success' }, { sqs: 'success', db: 'success' }]);
      expect(supportGalaxyServices.retriggerGalaxyTask).toHaveBeenCalledTimes(2);
    });

    it('should handle batch type request', async () => {
      const req = {
        body: {
          type: 'batch',
          action: 'someAction'
        }
      };
      supportDBService.findUserWithEmptyVisualID.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      supportGalaxyServices.retriggerGalaxyTask = jest.fn().mockResolvedValue({ sqs: 'success', db: 'success' });

      const result = await supportGalaxyServices.triggerGalaxyImportSvc(req);

      expect(result).toEqual([{ sqs: 'success', db: 'success' }, { sqs: 'success', db: 'success' }]);
      expect(supportDBService.findUserWithEmptyVisualID).toHaveBeenCalledWith(req);
      expect(supportGalaxyServices.retriggerGalaxyTask).toHaveBeenCalledTimes(2);
    });

    it('should return error message for invalid manual request', async () => {
      const req = {
        body: {
          type: 'manual',
          accounts: null
        }
      };
      commonService.valJsonObjOrArray.mockReturnValue(false);

      const result = await supportGalaxyServices.triggerGalaxyImportSvc(req);

      expect(result).toBe('supportGalaxyServices.triggerGalaxyImportSvc request is empty');
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('retriggerByType', () => {
    it('should retrigger Galaxy task for valid failed job', async () => {
      const req = { processTimer: 'someTimer' };
      const failedJob = {
        name: 'GalaxyWPService',
        action: 'callMembershipPassApi',
        data: {
          action: 'someAction',
          body: { migrations: true }
        }
      };
      supportGalaxyServices.retriggerGalaxyTask = jest.fn().mockResolvedValue({ sqs: 'success', db: 'success' });

      const result = await supportGalaxyServices.retriggerByType(req, failedJob);

      expect(result).toEqual({ sqs: 'success', db: 'success' });
      expect(supportGalaxyServices.retriggerGalaxyTask).toHaveBeenCalledWith(
        expect.objectContaining({ body: failedJob.data.body }),
        { action: 'someAction', migrations: true }
      );
    });

    it('should return false for invalid failed job', async () => {
      const req = { processTimer: 'someTimer' };
      const failedJob = {
        name: 'OtherService',
        action: 'someAction',
        data: { body: {} }
      };

      const result = await supportGalaxyServices.retriggerByType(req, failedJob);

      expect(result).toBe(false);
    });
  });

  describe('retriggerGalaxyTask', () => {
    it('should handle successful SQS and migration update', async () => {
      const req = { body: {} };
      const params = { action: 'someAction', migrations: true };
      galaxyWPService.galaxyToSQS.mockResolvedValue({ $metadata: { httpStatusCode: 200 } });
      userDBService.updateUserMigration.mockResolvedValue(true);

      const result = await supportGalaxyServices.retriggerGalaxyTask(req, params);

      expect(result).toEqual({ sqs: 'success', db: 'success' });
      expect(galaxyWPService.galaxyToSQS).toHaveBeenCalledWith(req, 'someAction');
      expect(userDBService.updateUserMigration).toHaveBeenCalledWith(req, 'signup', 'signupSQS');
    });

    it('should handle failed SQS', async () => {
      const req = { body: {} };
      const params = { action: 'someAction', migrations: false };
      galaxyWPService.galaxyToSQS.mockResolvedValue({ $metadata: { httpStatusCode: 400 } });

      const result = await supportGalaxyServices.retriggerGalaxyTask(req, params);

      expect(result).toEqual({ sqs: 'failed', db: 'Not require migration update' });
      expect(galaxyWPService.galaxyToSQS).toHaveBeenCalledWith(req, 'someAction');
      expect(userDBService.updateUserMigration).not.toHaveBeenCalled();
    });
  });
});
