jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

jest.mock('../../../logs/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../../db/models/passwordlessTokenModel', () => ({
  getTokenById: jest.fn(),
  markTokenAsInvalid: jest.fn(),
}));

jest.mock('../../../db/models/userCredentialEventsModel', () => ({
  getLastSendOTPEvent: jest.fn(),
}));

jest.mock('../../../helpers/dbSwitchesHelpers', () => ({
  switchIsTurnOn: jest.fn(),
}));

jest.mock('../../../api/users/helpers/userUpdateMembershipPassesHelper', () => ({
  getUserFromDBCognito: jest.fn(),
  isUserExisted: jest.fn(),
}));

jest.mock('../../../db/models/userModel', () => ({
  update: jest.fn(),
  findByEmail: jest.fn(),
}));

jest.mock('../../../db/models/configsModel', () => ({
  getValueByConfigValueName: jest.fn(),
  findByConfigKey: jest.fn(),
}));

jest.mock('../../../services/cognitoService', () => ({
  cognitoAdminListGroupsForUser: jest.fn(),
}));

jest.mock('../../../db/models/userMembershipModel', () => ({
  findByUserId: jest.fn(),
}));

jest.mock('../../../utils/cryptoEnvelope', () => ({
  encrypt: jest.fn(),
}));

const passwordlessSendCodeService = require('../../../api/users/myAccount/passwordless/passwordlessSendCodeServices');
const UserCredentialEventsModel = require('../../../db/models/userCredentialEventsModel');
const tokenModel = require('../../../db/models/passwordlessTokenModel');

describe('PasswordlessSendCodeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkWithinCooldownInterval', () => {
    const userId = 123;
    const otpInterval = 60;

    it('should return withinCooldown: false when no previous SEND_OTP event exists', async () => {
      UserCredentialEventsModel.getLastSendOTPEvent.mockResolvedValue(null);

      const result = await passwordlessSendCodeService.checkWithinCooldownInterval(
        userId,
        otpInterval,
      );

      expect(result).toEqual({ withinCooldown: false, remainingSeconds: 0 });
    });

    it('should return withinCooldown: true for pending event within cooldown', async () => {
      const now = new Date();
      const recentEvent = {
        id: 1,
        data: { email: 'test@example.com', pending: true },
        created_at: new Date(now.getTime() - 30000),
      };
      UserCredentialEventsModel.getLastSendOTPEvent.mockResolvedValue(recentEvent);

      const result = await passwordlessSendCodeService.checkWithinCooldownInterval(
        userId,
        otpInterval,
      );

      expect(result.withinCooldown).toBe(true);
      expect(result.remainingSeconds).toBeGreaterThan(0);
      expect(result.remainingSeconds).toBeLessThanOrEqual(30);
    });

    it('should return withinCooldown: false for pending event outside cooldown', async () => {
      const now = new Date();
      const oldEvent = {
        id: 1,
        data: { email: 'test@example.com', pending: true },
        created_at: new Date(now.getTime() - 120000),
      };
      UserCredentialEventsModel.getLastSendOTPEvent.mockResolvedValue(oldEvent);

      const result = await passwordlessSendCodeService.checkWithinCooldownInterval(
        userId,
        otpInterval,
      );

      expect(result).toEqual({ withinCooldown: false, remainingSeconds: 0 });
    });

    it('should handle event with token_id within cooldown', async () => {
      const now = new Date();
      const recentEvent = {
        id: 1,
        data: { email: 'test@example.com', token_id: 456 },
        created_at: new Date(now.getTime() - 30000),
      };
      UserCredentialEventsModel.getLastSendOTPEvent.mockResolvedValue(recentEvent);
      tokenModel.getTokenById.mockResolvedValue({ id: 456, is_valid: 1 });

      const result = await passwordlessSendCodeService.checkWithinCooldownInterval(
        userId,
        otpInterval,
      );

      expect(result.withinCooldown).toBe(true);
      expect(result.remainingSeconds).toBeGreaterThan(0);
    });

    it('should mark token as invalid when cooldown expires', async () => {
      const now = new Date();
      const oldEvent = {
        id: 1,
        data: { email: 'test@example.com', token_id: 456 },
        created_at: new Date(now.getTime() - 120000),
      };
      UserCredentialEventsModel.getLastSendOTPEvent.mockResolvedValue(oldEvent);
      tokenModel.markTokenAsInvalid.mockResolvedValue(true);

      const result = await passwordlessSendCodeService.checkWithinCooldownInterval(
        userId,
        otpInterval,
      );

      expect(result).toEqual({ withinCooldown: false, remainingSeconds: 0 });
      expect(tokenModel.markTokenAsInvalid).toHaveBeenCalledWith(456);
    });

    it('should not call markTokenAsInvalid for pending events without token_id', async () => {
      const now = new Date();
      const oldEvent = {
        id: 1,
        data: { email: 'test@example.com', pending: true },
        created_at: new Date(now.getTime() - 120000),
      };
      UserCredentialEventsModel.getLastSendOTPEvent.mockResolvedValue(oldEvent);

      const result = await passwordlessSendCodeService.checkWithinCooldownInterval(
        userId,
        otpInterval,
      );

      expect(result).toEqual({ withinCooldown: false, remainingSeconds: 0 });
      expect(tokenModel.markTokenAsInvalid).not.toHaveBeenCalled();
    });

    it('should block concurrent requests when pending event exists', async () => {
      const now = new Date();
      const pendingEvent = {
        id: 1,
        data: { email: 'test@example.com', pending: true },
        created_at: new Date(now.getTime() - 100),
      };
      UserCredentialEventsModel.getLastSendOTPEvent.mockResolvedValue(pendingEvent);

      const result = await passwordlessSendCodeService.checkWithinCooldownInterval(
        userId,
        otpInterval,
      );

      expect(result.withinCooldown).toBe(true);
      expect(result.remainingSeconds).toBeGreaterThan(50);
    });
  });
});
