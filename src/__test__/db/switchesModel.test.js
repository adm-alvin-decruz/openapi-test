const Switch = require('../../db/models/switches/switchesModel');
const pool = require('../../db/connections/mysqlConn');
const commonService = require('../../services/commonService');
const loggerService = require('../../logs/logger');

// Mock dependencies
jest.mock('../../db/connections/mysqlConn', () => ({
  execute: jest.fn(),
  query: jest.fn(),
}));

jest.mock('../../services/commonService', () => ({
  replaceSqlPlaceholders: jest.fn(),
}));

jest.mock('../../logs/logger', () => ({
  error: jest.fn(),
}));

describe('Switch Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new switch successfully', async () => {
      const mockData = {
        name: 'test_switch',
        switch: 1,
        description: 'Test switch',
      };
      const mockResult = { insertId: 1 };
      const mockSqlStatement = 'INSERT statement';

      pool.execute.mockResolvedValue(mockResult);
      commonService.replaceSqlPlaceholders.mockReturnValue(mockSqlStatement);

      const result = await Switch.create(mockData);

      expect(pool.execute).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO switches'), [
        mockData.name,
        mockData.switch,
        mockData.description,
      ]);
      expect(result).toEqual({
        sql_statement: mockSqlStatement,
        newsletter_id: mockResult.insertId,
      });
    });

    it('should handle create error', async () => {
      const mockData = {
        name: 'test_switch',
        switch: 1,
        description: 'Test switch',
      };
      const mockError = new Error('Database error');

      pool.execute.mockRejectedValue(mockError);
      console.error = jest.fn();

      await Switch.create(mockData);

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('findByName', () => {
    it('should find switch by name successfully', async () => {
      const mockName = 'test_switch';
      const mockResult = [{ id: 1, name: 'test_switch' }];

      pool.query.mockResolvedValue(mockResult);

      const result = await Switch.findByName(mockName);

      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM switches WHERE name = ?', [mockName]);
      expect(result).toEqual(mockResult[0]);
    });

    it('should handle findByName error', async () => {
      const mockName = 'test_switch';
      const mockError = new Error('Database error');

      pool.query.mockRejectedValue(mockError);

      await Switch.findByName(mockName);

      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should find all switches successfully', async () => {
      const mockResult = [
        { id: 1, name: 'switch1' },
        { id: 2, name: 'switch2' },
      ];

      pool.query.mockResolvedValue(mockResult);

      const result = await Switch.findAll();

      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM switches');
      expect(result).toEqual(mockResult);
    });

    it('should handle findAll error', async () => {
      const mockError = new Error('Database error');
      pool.query.mockRejectedValue(mockError);

      await expect(Switch.findAll()).rejects.toThrow('Error reading all switches');
    });
  });

  describe('update', () => {
    it('should update switch successfully', async () => {
      const mockId = 1;
      const mockData = {
        name: 'updated_switch',
        switch: 0,
        description: 'Updated description',
      };
      const mockResult = { affectedRows: 1 };
      const mockSqlStatement = 'UPDATE statement';

      pool.execute.mockResolvedValue(mockResult);
      commonService.replaceSqlPlaceholders.mockReturnValue(mockSqlStatement);

      const result = await Switch.update(mockId, mockData);

      expect(pool.execute).toHaveBeenCalledWith(expect.stringContaining('UPDATE switches'), [
        mockData.name,
        mockData.switch,
        mockData.description,
        mockId,
      ]);
      expect(result).toEqual({
        sql_statement: mockSqlStatement,
        newsletter_id: mockResult.affectedRows,
      });
    });

    it('should handle update error', async () => {
      const mockId = 1;
      const mockData = {
        name: 'updated_switch',
        switch: 0,
        description: 'Updated description',
      };
      const mockError = new Error('Database error');

      pool.execute.mockRejectedValue(mockError);

      await expect(Switch.update(mockId, mockData)).rejects.toThrow('Error updating switch');
    });
  });

  describe('updateMultiple', () => {
    it('should update multiple switches successfully', async () => {
      const mockReqBody = [
        { id: 1, switch: 1, description: 'Switch 1' },
        { id: 2, switch: 0, description: 'Switch 2' },
      ];
      const mockResult = { affectedRows: 1 };
      const mockSqlStatement = 'UPDATE statement';

      pool.execute.mockResolvedValue(mockResult);
      commonService.replaceSqlPlaceholders.mockReturnValue(mockSqlStatement);

      const result = await Switch.updateMultiple(mockReqBody);

      expect(pool.execute).toHaveBeenCalledTimes(mockReqBody.length);
      expect(result).toHaveProperty('sql_statement');
      expect(result).toHaveProperty('switches');
    });

    it('should handle updateMultiple error', async () => {
      const mockReqBody = [{ id: 1, switch: 1, description: 'Switch 1' }];
      const mockError = new Error('Database error');

      pool.execute.mockRejectedValue(mockError);
      console.error = jest.fn();

      await Switch.updateMultiple(mockReqBody);

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete switch successfully', async () => {
      const mockId = 1;
      const mockResult = { affectedRows: 1 };
      const mockSqlStatement = 'DELETE statement';

      pool.execute.mockResolvedValue(mockResult);
      commonService.replaceSqlPlaceholders.mockReturnValue(mockSqlStatement);

      const result = await Switch.delete(mockId);

      expect(pool.execute).toHaveBeenCalledWith('DELETE FROM switches WHERE id = ?', [mockId]);
      expect(result).toHaveProperty('sql_statement');
      expect(result).toHaveProperty('newsletter_id');
    });

    it('should handle delete error', async () => {
      const mockId = 1;
      const mockError = new Error('Database error');

      pool.execute.mockRejectedValue(mockError);

      await expect(Switch.delete(mockId)).rejects.toThrow('Error updating switch');
    });
  });
});
