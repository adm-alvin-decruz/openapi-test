const { EmailDomainModel } = require('../../db/models/emailDomainsModel');
const db = require('../../db/connections/mysqlConn');

// Mock the database connection
jest.mock('../../db/connections/mysqlConn', () => ({
  query: jest.fn(),
  execute: jest.fn()
}));

describe('EmailDomainModel', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getMySQLDateTime', () => {
    it('should return formatted datetime string', () => {
      // Mock date for consistent testing
      const mockDate = new Date('2024-01-01T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const result = EmailDomainModel.getMySQLDateTime();
      expect(result).toBe('2024-01-01 12:00:00');
    });
  });

  describe('findById', () => {
    it('should query database with correct SQL and parameters', async () => {
      const mockId = 1;
      const mockResult = [{ id: 1, domain: 'example.com' }];
      db.query.mockResolvedValue(mockResult);

      const result = await EmailDomainModel.findById(mockId);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT * FROM email_domains WHERE id = ?',
        [mockId]
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('findByDomain', () => {
    it('should query database with correct SQL and parameters', async () => {
      const mockDomain = 'example.com';
      const mockResult = [{ id: 1, domain: 'example.com' }];
      db.query.mockResolvedValue(mockResult);

      const result = await EmailDomainModel.findByDomain(mockDomain);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT * FROM email_domains WHERE domain = ?',
        [mockDomain]
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('create', () => {
    it('should create domain with default valid status', async () => {
      const mockDomain = 'example.com';
      const mockDateTime = '2024-01-01 12:00:00';
      const mockResult = { insertId: 1 };

      jest.spyOn(EmailDomainModel, 'getMySQLDateTime')
        .mockReturnValue(mockDateTime);
      db.execute.mockResolvedValue(mockResult);

      const result = await EmailDomainModel.create(mockDomain);

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO email_domains'),
        [mockDomain, 0, mockDateTime, mockDateTime]
      );
      expect(result).toEqual(mockResult);
    });

    it('should create domain with specified valid status', async () => {
      const mockDomain = 'example.com';
      const mockValid = 1;
      const mockDateTime = '2024-01-01 12:00:00';

      jest.spyOn(EmailDomainModel, 'getMySQLDateTime')
        .mockReturnValue(mockDateTime);

      await EmailDomainModel.create(mockDomain, mockValid);

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO email_domains'),
        [mockDomain, mockValid, mockDateTime, mockDateTime]
      );
    });
  });

  describe('update', () => {
    it('should update allowed fields', async () => {
      const mockId = 1;
      const mockData = { domain: 'new.com', valid: 1 };
      const mockResult = { affectedRows: 1 };
      db.execute.mockResolvedValue(mockResult);

      const result = await EmailDomainModel.update(mockId, mockData);

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE email_domains'),
        expect.arrayContaining(['new.com', 1, mockId])
      );
      expect(result).toEqual(mockResult);
    });

    it('should return null if no allowed fields to update', async () => {
      const mockId = 1;
      const mockData = { invalidField: 'value' };

      const result = await EmailDomainModel.update(mockId, mockData);

      expect(result).toBeNull();
      expect(db.execute).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete domain with specified id', async () => {
      const mockId = 1;
      const mockResult = { affectedRows: 1 };
      db.execute.mockResolvedValue(mockResult);

      const result = await EmailDomainModel.delete(mockId);

      expect(db.execute).toHaveBeenCalledWith(
        'DELETE FROM email_domains WHERE id = ?',
        [mockId]
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('listDomains', () => {
    it('should list domains with default pagination', async () => {
      const mockResult = [{ id: 1, domain: 'example.com' }];
      db.query.mockResolvedValue(mockResult);

      const result = await EmailDomainModel.listDomains();

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM email_domains'),
        [10, 0]
      );
      expect(result).toEqual(mockResult);
    });

    it('should list domains with custom pagination', async () => {
      const page = 2;
      const limit = 5;
      const mockResult = [{ id: 1, domain: 'example.com' }];
      db.query.mockResolvedValue(mockResult);

      const result = await EmailDomainModel.listDomains(page, limit);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM email_domains'),
        [limit, 5]
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('upsert', () => {
    it('should insert new domain successfully', async () => {
      const mockDomain = 'example.com';
      const mockDateTime = '2024-01-01 12:00:00';
      const mockResult = {
        insertId: 1,
        affectedRows: 1,
        changedRows: 0
      };

      jest.spyOn(EmailDomainModel, 'getMySQLDateTime')
        .mockReturnValue(mockDateTime);
      db.execute.mockResolvedValue(mockResult);

      await EmailDomainModel.upsert(mockDomain);

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO email_domains'),
        [mockDomain, 0, mockDateTime, mockDateTime, mockDateTime]
      );
    });

    it('should handle upsert error', async () => {
      const mockDomain = 'example.com';
      db.execute.mockRejectedValue(new Error('Database error'));

      await expect(EmailDomainModel.upsert(mockDomain))
        .rejects
        .toThrow('Upsert failed: Database error');
    });
  });
});
