const axios = require('axios');
const FormData = require('form-data');
const loggerService = require('../../logs/logger');
const AEMService = require('../../services/AEMService');

// Mock external dependencies
jest.mock('axios');
jest.mock('form-data');
jest.mock('../../logs/logger');

describe('AEMService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock environment variables
    process.env.APP_ENV = 'test';
    process.env.AEM_URL = 'http://test-aem.com';
    process.env.AEM_PATH_WILDPASS_CHECK_EMAIL = '/check-email';
    process.env.AEM_PATH_RESEND_WILDPASS = '/resend-wildpass';
  });

  describe('aemCheckWildPassByEmail', () => {
    it('should successfully check wildpass by email', async () => {
      const mockResponse = { data: { success: true } };
      axios.post.mockResolvedValue(mockResponse);

      const reqBody = { email: 'test@example.com' };
      const result = await AEMService.aemCheckWildPassByEmail(reqBody);

      expect(axios.post).toHaveBeenCalledWith(
        'http://test-aem.com/check-email',
        expect.any(FormData)
      );
      expect(result).toEqual(mockResponse.data);
      expect(loggerService.log).toHaveBeenCalled();
    });

    it('should handle errors when checking wildpass', async () => {
      const mockError = new Error('API Error');
      axios.post.mockRejectedValue(mockError);

      const reqBody = { email: 'test@example.com' };
      const result = await AEMService.aemCheckWildPassByEmail(reqBody);

      expect(axios.post).toHaveBeenCalled();
      expect(result).toEqual(mockError);
      expect(loggerService.log).toHaveBeenCalled();
    });
  });

  describe('aemResendWildpass', () => {
    it('should successfully resend wildpass', async () => {
      const mockResponse = { data: { success: true } };
      axios.post.mockResolvedValue(mockResponse);

      const reqBody = { email: 'test@example.com', recaptchaResponse: 'recaptcha_token' };
      const result = await AEMService.aemResendWildpass(reqBody);

      expect(axios.post).toHaveBeenCalledWith(
        'http://test-aem.com/resend-wildpass',
        expect.any(FormData)
      );
      expect(result).toEqual(mockResponse.data);
      expect(loggerService.log).toHaveBeenCalled();
    });

    it('should handle errors when resending wildpass', async () => {
      const mockError = new Error('API Error');
      axios.post.mockRejectedValue(mockError);

      const reqBody = { email: 'test@example.com', recaptchaResponse: 'recaptcha_token' };
      const result = await AEMService.aemResendWildpass(reqBody);

      expect(axios.post).toHaveBeenCalled();
      expect(result).toEqual(mockError);
      expect(loggerService.log).toHaveBeenCalled();
    });
  });

  /** Expected to be failed due to buildAemURL() is not exported in module */
  /** To success test, temporary expert the buildAemURL() in AEMService.js */
  // describe('buildAemURL', () => {
  //   it('should build correct AEM URL for WILDPASS_CHECK_EMAIL', () => {
  //     const result = AEMService.buildAemURL('test', 'WILDPASS_CHECK_EMAIL');
  //     expect(result).toBe('http://test-aem.com/check-email');
  //   });

  //   it('should build correct AEM URL for RESEND_WILDPASS', () => {
  //     const result = AEMService.buildAemURL('test', 'RESEND_WILDPASS');
  //     expect(result).toBe('http://test-aem.com/resend-wildpass');
  //   });
  // });
});
