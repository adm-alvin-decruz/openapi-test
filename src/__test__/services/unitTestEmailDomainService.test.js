const EmailDomainService = require('../../services/emailDomainsService');
const loggerService = require("../../logs/logger");
const ApiUtils = require('../../utils/apiUtils');
const switchService = require('../../services/switchService');

// Mock dependencies with proper jest.fn() setup
jest.mock('../../db/models/emailDomainsModel', () => ({
  EmailDomainModel: {
    create: jest.fn(),
    update: jest.fn(),
    findByDomain: jest.fn(),
    upsert: jest.fn()
  }
}));

jest.mock('../../logs/logger', () => ({
  error: jest.fn(),
  log: jest.fn()
}));

jest.mock('../../utils/apiUtils', () => ({
  makeRequest: jest.fn()
}));

jest.mock('../../services/switchService', () => ({
  findByName: jest.fn()
}));

describe('EmailDomainService', () => {
  let EmailDomainModel;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Import the mocked EmailDomainModel
    EmailDomainModel = require('../../db/models/emailDomainsModel').EmailDomainModel;
  });

  describe('createDomain', () => {
    it('should create a domain with default valid status', async () => {
      const domain = 'mandai.com';
      const mockResponse = { domain, valid: 0 };

      // Properly set up the mock
      EmailDomainModel.create.mockImplementation(() => Promise.resolve(mockResponse));

      const result = await EmailDomainService.createDomain(domain);

      expect(EmailDomainModel.create).toHaveBeenCalledWith(domain, 0);
      expect(result).toEqual(mockResponse);
    });

    it('should log error for invalid domain format', async () => {
      const invalidDomain = 'invalid@domain';
      await EmailDomainService.createDomain(invalidDomain);

      expect(loggerService.error).toHaveBeenCalledWith(`Invalid domain format ${invalidDomain}`);
    });
  });

  describe('updateDomainStatus', () => {
    it('should update domain status successfully', async () => {
      const id = 1;
      const valid = 1;
      const mockResponse = { id, valid };

      EmailDomainModel.update.mockImplementation(() => Promise.resolve(mockResponse));

      const result = await EmailDomainService.updateDomainStatus(id, valid);

      expect(EmailDomainModel.update).toHaveBeenCalledWith(id, { valid });
      expect(result).toEqual(mockResponse);
    });

    it('should throw error for invalid status value', async () => {
      const id = 1;
      const invalid = 4;

      await expect(EmailDomainService.updateDomainStatus(id, invalid))
        .rejects.toThrow('Invalid status value');
    });
  });

  describe('checkEmailDomainValidity', () => {
    it('should return unknown status for non-existing domain', async () => {
      const email = 'test@nonexistent.com';
      EmailDomainModel.findByDomain.mockImplementation(() => Promise.resolve([]));

      const result = await EmailDomainService.checkEmailDomainValidity(email);

      expect(result).toEqual({
        isValid: false,
        status: 'unknown',
        message: `Domain not found in database. Email: ${email}`
      });
    });

    it('should return correct status for whitelisted domain', async () => {
      const email = 'test@mandai.com';
      EmailDomainModel.findByDomain.mockImplementation(() => Promise.resolve([{ valid: 1 }]));

      const result = await EmailDomainService.checkEmailDomainValidity(email);

      expect(result).toEqual({
        isValid: true,
        status: 'whitelist',
        message: 'Domain is whitelisted'
      });
    });
  });

  describe('valApiDisposableEmail', () => {
    it('should detect disposable email and update database', async () => {
      const email = 'test@disposable.com';
      ApiUtils.makeRequest.mockImplementation(() => Promise.resolve({ disposable: "true" }));
      EmailDomainService.domain = 'disposable.com';

      const result = await EmailDomainService.valApiDisposableEmail(email);

      expect(result).toBe(true);
      expect(EmailDomainModel.upsert).toHaveBeenCalledWith('disposable.com', 3);
    });

    it('should handle valid email domains', async () => {
      const email = 'test@valid.com';
      ApiUtils.makeRequest.mockImplementation(() => Promise.resolve({ disposable: "false" }));
      EmailDomainService.domain = 'valid.com';

      const result = await EmailDomainService.valApiDisposableEmail(email);

      expect(result).toBe(false);
      expect(EmailDomainModel.create).toHaveBeenCalledWith('valid.com', 0);
    });

    it('should handle API errors gracefully', async () => {
      const email = 'test@mandai.com';
      ApiUtils.makeRequest.mockImplementation(() => Promise.reject(new Error('API Error')));

      const result = await EmailDomainService.valApiDisposableEmail(email);

      expect(result).toBe(false);
      expect(loggerService.error).toHaveBeenCalled();
    });
  });
});
