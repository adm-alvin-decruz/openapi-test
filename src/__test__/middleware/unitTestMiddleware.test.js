const validationMiddleware = require('../../middleware/validationMiddleware');
const resHelper = require('../../helpers/responseHelpers');
const EmailDomainService = require('../../services/emailDomainsService');
const loggerService = require('../../logs/logger');

// Mock dependencies
jest.mock('../../helpers/responseHelpers');
jest.mock('../../services/emailDomainsService');
jest.mock('../../logs/logger');

describe('ValidationMiddleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock request, response, and next function
    mockReq = {
      method: 'POST',
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockNext = jest.fn();

    // Setup default response helper mock
    resHelper.formatMiddlewareRes.mockImplementation((status, msg) => ({
      status,
      message: msg
    }));
  });

  describe('isEmptyRequest', () => {
    it('should call next() for GET requests', () => {
      mockReq.method = 'GET';

      validationMiddleware.isEmptyRequest(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 400 for empty POST request body', () => {
      mockReq.method = 'POST';
      mockReq.body = {};

      validationMiddleware.isEmptyRequest(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(resHelper.formatMiddlewareRes).toHaveBeenCalledWith(400, 'Request body is empty');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() for non-empty POST request body', () => {
      mockReq.method = 'POST';
      mockReq.body = { data: 'test' };

      validationMiddleware.isEmptyRequest(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    ['PUT', 'PATCH'].forEach(method => {
      it(`should validate empty request body for ${method} requests`, () => {
        mockReq.method = method;
        mockReq.body = {};

        validationMiddleware.isEmptyRequest(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(resHelper.formatMiddlewareRes).toHaveBeenCalledWith(400, 'Request body is empty');
      });
    });
  });

  describe('validateEmail', () => {
    beforeEach(() => {
      // Default mock implementations
      EmailDomainService.emailFormatTest.mockResolvedValue(true);
      EmailDomainService.getCheckDomainSwitch.mockResolvedValue(false);
      EmailDomainService.validateEmailDomain.mockResolvedValue(true);
    });

    it('should return 400 if email is missing', async () => {
      mockReq.body = {};

      await validationMiddleware.validateEmail(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(resHelper.formatMiddlewareRes).toHaveBeenCalledWith(400, 'The email is invalid');
    });

    it('should return 400 for invalid email format', async () => {
      mockReq.body = { email: 'invalid-email' };
      EmailDomainService.emailFormatTest.mockResolvedValue(false);

      await validationMiddleware.validateEmail(mockReq, mockRes, mockNext);

      expect(loggerService.error).toHaveBeenCalledWith('Invalid email format invalid-email', mockReq);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(resHelper.formatMiddlewareRes).toHaveBeenCalledWith(400, 'The email is invalid');
    });

    it('should validate domain when check domain switch is on', async () => {
      mockReq.body = { email: 'test@example.com' };
      EmailDomainService.getCheckDomainSwitch.mockResolvedValue(true);
      EmailDomainService.validateEmailDomain.mockResolvedValue(true);

      await validationMiddleware.validateEmail(mockReq, mockRes, mockNext);

      expect(EmailDomainService.validateEmailDomain).toHaveBeenCalledWith('test@example.com');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 400 for invalid domain when check is enabled', async () => {
      mockReq.body = { email: 'test@example.com' };
      EmailDomainService.getCheckDomainSwitch.mockResolvedValue(true);
      EmailDomainService.validateEmailDomain.mockResolvedValue(false);

      await validationMiddleware.validateEmail(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(resHelper.formatMiddlewareRes).toHaveBeenCalledWith(400, 'The email is invalid');
    });

    it('should skip domain validation when check domain switch is off', async () => {
      mockReq.body = { email: 'test@example.com' };
      EmailDomainService.getCheckDomainSwitch.mockResolvedValue(false);

      await validationMiddleware.validateEmail(mockReq, mockRes, mockNext);

      expect(EmailDomainService.validateEmailDomain).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('resStatusFormatter', () => {
    it('should format response with status and message', () => {
      const status = 400;
      const msg = 'Test error message';
      const mockFormattedResponse = { status, message: msg };

      resHelper.formatMiddlewareRes.mockReturnValue(mockFormattedResponse);

      validationMiddleware.resStatusFormatter(mockRes, status, msg);

      expect(mockRes.status).toHaveBeenCalledWith(status);
      expect(mockRes.json).toHaveBeenCalledWith(mockFormattedResponse);
      expect(resHelper.formatMiddlewareRes).toHaveBeenCalledWith(status, msg);
    });
  });
});
