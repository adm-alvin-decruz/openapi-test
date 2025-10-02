const SwitchService = require('../../services/switchService');
const switchDBModel = require('../../db/models/switches/switchesModel');

// Mock dependencies
jest.mock('../../db/models/switches/switchesModel');

describe('SwitchService', () => {
  // Store original console.error
  const originalConsoleError = console.error;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Mock console.error
    console.error = jest.fn();
  });

  afterEach(() => {
    // Restore console.error after each test
    console.error = originalConsoleError;
  });

  describe('getAllSwitches', () => {
    it('should return all switches successfully', async () => {
      const mockSwitches = [
        { id: 1, name: 'switch1', switch: 1 },
        { id: 2, name: 'switch2', switch: 0 },
      ];
      switchDBModel.findAll.mockResolvedValue(mockSwitches);

      const result = await SwitchService.getAllSwitches();

      expect(switchDBModel.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockSwitches);
    });

    it('should handle empty result', async () => {
      switchDBModel.findAll.mockResolvedValue([]);

      const result = await SwitchService.getAllSwitches();

      expect(switchDBModel.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      switchDBModel.findAll.mockRejectedValue(error);

      await expect(SwitchService.getAllSwitches()).rejects.toThrow('Database error');
    });
  });

  describe('findByName', () => {
    it('should find switch by name successfully', async () => {
      const mockSwitch = { id: 1, name: 'test_switch', switch: 1 };
      switchDBModel.findByName.mockResolvedValue(mockSwitch);

      const result = await SwitchService.findByName('test_switch');

      expect(switchDBModel.findByName).toHaveBeenCalledWith('test_switch');
      expect(result).toEqual(mockSwitch);
    });

    it('should handle non-existent switch name', async () => {
      switchDBModel.findByName.mockResolvedValue(null);

      const result = await SwitchService.findByName('non_existent');

      expect(switchDBModel.findByName).toHaveBeenCalledWith('non_existent');
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      switchDBModel.findByName.mockRejectedValue(error);

      await expect(SwitchService.findByName('test_switch')).rejects.toThrow('Database error');
    });
  });

  describe('findSwitchValue', () => {
    describe('Input validation', () => {
      it('should return false for null data', async () => {
        const result = await SwitchService.findSwitchValue(null, 'test');

        expect(result).toBe(false);
        expect(console.error).toHaveBeenCalledWith(
          'SwitchService Error: Input data must be an object or an array',
        );
      });

      it('should return false for non-object data', async () => {
        const result = await SwitchService.findSwitchValue('string', 'test');

        expect(result).toBe(false);
        expect(console.error).toHaveBeenCalledWith(
          'SwitchService Error: Input data must be an object or an array',
        );
      });

      it('should return false for non-string name', async () => {
        const result = await SwitchService.findSwitchValue({}, 123);

        expect(result).toBe(false);
        expect(console.error).toHaveBeenCalledWith('SwitchService Error: Name must be a string');
      });
    });

    describe('Array data handling', () => {
      it('should find switch value in array', async () => {
        const data = [
          { name: 'switch1', switch: 1 },
          { name: 'switch2', switch: 0 },
        ];

        const result = await SwitchService.findSwitchValue(data, 'switch1');
        expect(result).toBe(true);
      });

      it('should return false for non-existent switch in array', async () => {
        const data = [
          { name: 'switch1', switch: 1 },
          { name: 'switch2', switch: 0 },
        ];

        const result = await SwitchService.findSwitchValue(data, 'switch3');
        expect(result).toBe(false);
      });

      it('should handle falsy switch values in array', async () => {
        const data = [
          { name: 'switch1', switch: 0 },
          { name: 'switch2', switch: false },
        ];

        const result = await SwitchService.findSwitchValue(data, 'switch1');
        expect(result).toBe(false);
      });
    });

    describe('Object data handling', () => {
      it('should find switch value in object', async () => {
        const data = {
          switch1: { switch: 1 },
          switch2: { switch: 0 },
        };

        const result = await SwitchService.findSwitchValue(data, 'switch1');
        expect(result).toBe(true);
      });

      it('should return false for non-existent switch in object', async () => {
        const data = {
          switch1: { switch: 1 },
        };

        const result = await SwitchService.findSwitchValue(data, 'switch2');
        expect(result).toBe(false);
      });

      it('should handle falsy switch values in object', async () => {
        const data = {
          switch1: { switch: 0 },
          switch2: { switch: false },
        };

        const result = await SwitchService.findSwitchValue(data, 'switch1');
        expect(result).toBe(false);
      });
    });

    describe('Error handling', () => {
      it('should handle and return false for malformed data', async () => {
        const data = {
          switch1: 'invalid',
        };

        const result = await SwitchService.findSwitchValue(data, 'switch1');
        expect(result).toBe(false);
        // expect(console.error).toHaveBeenCalled();
      });

      it('should handle and return false for undefined switch property', async () => {
        const data = {
          switch1: {},
        };

        const result = await SwitchService.findSwitchValue(data, 'switch1');
        expect(result).toBe(false);
      });
    });
  });
});
