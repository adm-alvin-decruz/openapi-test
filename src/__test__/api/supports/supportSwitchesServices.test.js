const SupportSwitchesServices = require('../../../api/supports/supportSwitchesServices');
const supportDBService = require('../../../api/supports/supportDBServices');
const SwitchesModel = require('../../../db/models/switches/switchesModel');

// Mock dependencies
jest.mock('../../../api/supports/supportDBServices');
jest.mock('../../../db/models/switches/switchesModel');

describe('SupportSwitchesServices', () => {
  // Mock console.log to prevent cluttering test output
  const originalConsoleLog = console.log;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Mock console.log
    console.log = jest.fn();
  });

  afterEach(() => {
    // Restore console.log after each test
    console.log = originalConsoleLog;
  });

  describe('getAllSwitchesService', () => {
    it('should return all switches successfully', async () => {
      // Mock data
      const mockSwitches = [
        { id: 1, name: 'switch1', switch: 1, description: 'Switch 1' },
        { id: 2, name: 'switch2', switch: 0, description: 'Switch 2' }
      ];

      // Setup mock
      SwitchesModel.findAll.mockResolvedValue(mockSwitches);

      // Execute method
      const result = await SupportSwitchesServices.getAllSwitchesService();

      // Assertions
      expect(SwitchesModel.findAll).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(mockSwitches);
      expect(result).toEqual(mockSwitches);
    });

    it('should handle empty result', async () => {
      // Mock empty response
      const mockEmptyResult = [];
      SwitchesModel.findAll.mockResolvedValue(mockEmptyResult);

      // Execute method
      const result = await SupportSwitchesServices.getAllSwitchesService();

      // Assertions
      expect(SwitchesModel.findAll).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(mockEmptyResult);
      expect(result).toEqual(mockEmptyResult);
    });

    it('should handle errors from findAll', async () => {
      // Mock error
      const mockError = new Error('Database error');
      SwitchesModel.findAll.mockRejectedValue(mockError);

      // Execute and assert
      await expect(SupportSwitchesServices.getAllSwitchesService())
        .rejects
        .toThrow('Database error');
    });
  });

  describe('updateSwitchesService', () => {
    it('should update multiple switches successfully', async () => {
      // Mock request and response
      const mockRequest = {
        body: [
          { id: 1, switch: 1, description: 'Updated Switch 1' },
          { id: 2, switch: 0, description: 'Updated Switch 2' }
        ]
      };

      const mockUpdateResult = {
        sql_statement: ['UPDATE statement 1', 'UPDATE statement 2'],
        switches: [
          { affectedRows: 1 },
          { affectedRows: 1 }
        ]
      };

      // Setup mock
      SwitchesModel.updateMultiple.mockResolvedValue(mockUpdateResult);

      // Execute method
      const result = await SupportSwitchesServices.updateSwitchesService(mockRequest);

      // Assertions
      expect(SwitchesModel.updateMultiple).toHaveBeenCalledWith(mockRequest.body);
      expect(result).toEqual(mockUpdateResult);
    });

    it('should handle empty request body', async () => {
      // Mock request with empty body
      const mockRequest = {
        body: []
      };

      const mockUpdateResult = {
        sql_statement: [],
        switches: []
      };

      // Setup mock
      SwitchesModel.updateMultiple.mockResolvedValue(mockUpdateResult);

      // Execute method
      const result = await SupportSwitchesServices.updateSwitchesService(mockRequest);

      // Assertions
      expect(SwitchesModel.updateMultiple).toHaveBeenCalledWith([]);
      expect(result).toEqual(mockUpdateResult);
    });

    it('should handle errors from updateMultiple', async () => {
      // Mock request and error
      const mockRequest = {
        body: [
          { id: 1, switch: 1, description: 'Switch 1' }
        ]
      };

      const mockError = new Error('Update failed');
      SwitchesModel.updateMultiple.mockRejectedValue(mockError);

      // Execute and assert
      await expect(SupportSwitchesServices.updateSwitchesService(mockRequest))
        .rejects
        .toThrow('Update failed');
    });

    it('should handle invalid request body format', async () => {
      // Mock invalid request
      const mockRequest = {
        body: 'invalid'
      };

      const mockError = new Error('Invalid request body');
      SwitchesModel.updateMultiple.mockRejectedValue(mockError);

      // Execute and assert
      await expect(SupportSwitchesServices.updateSwitchesService(mockRequest))
        .rejects
        .toThrow('Invalid request body');
    });
  });
});
