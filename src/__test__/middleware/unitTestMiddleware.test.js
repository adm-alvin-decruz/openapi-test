const { isEmptyRequest, validateEmail } = require('../../middleware/validationMiddleware');
const resHelper = require('../../helpers/responseHelpers'); // Assuming this is the correct path

// Mock the resHelper
jest.mock('../../helpers/responseHelpers', () => ({
  formatMiddlewareRes: jest.fn((status, message) => ({ status, message }))
}));

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: 'POST',
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('isEmptyRequest', () => {
    it('should call next() for non-empty POST request', () => {
      req.body = { key: 'value' };
      isEmptyRequest(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 400 for empty POST request', () => {
      isEmptyRequest(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 400,
          message: 'Request body is empty'
        })
      );
    });

    it('should call next() for GET request', () => {
      req.method = 'GET';
      isEmptyRequest(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateEmail', () => {
    it('should call next() for valid email', () => {
      req.body = { email: 'test@example.com' };
      validateEmail(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 400 for missing email', () => {
      validateEmail(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 400,
          message: 'The email is invalid'
        })
      );
    });

    it('should return 400 for invalid email format', () => {
      req.body = { email: 'invalid-email' };
      validateEmail(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 400,
          message: 'The email is invalid'
        })
      );
    });
  });
});
