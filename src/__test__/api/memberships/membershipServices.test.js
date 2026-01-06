const cognitoService = require('../../../services/cognitoService');
const membershipService = require('../../../api/memberships/membershipsServices');
const userModel = require('../../../db/models/userModel');

jest.mock('../../../services/cognitoService', () => ({
  cognitoAdminListGroupsForUser: jest.fn(),
  cognitoAdminGetUserByEmail: jest.fn(),
}));
jest.mock('../../../db/models/userModel', () => ({
  findPassesByUserEmailOrMandaiId: jest.fn(),
}));

describe('MembershipService', () => {
  describe('checkUserMembership', () => {
    it('should throw error MWG_CIAM_USERS_MEMBERSHIP_NULL and when Cognito and DB not found user', async () => {
      jest.spyOn(cognitoService, 'cognitoAdminListGroupsForUser').mockRejectedValue(
        new Error(
          JSON.stringify({
            status: 'failed',
            data: {
              name: 'UserNotFoundException',
            },
          }),
        ),
      );
      jest.spyOn(userModel, 'findPassesByUserEmailOrMandaiId').mockResolvedValue([]);
      await expect(
        membershipService.checkUserMembership({
          email: 'test-email@gmail.com',
          group: 'wildpass',
        }),
      ).rejects.toThrow(
        JSON.stringify({
          membership: {
            code: 200,
            mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_NULL',
            message: 'No record found.',
            email: 'test-email@gmail.com',
          },
          status: 'success',
          statusCode: 200,
        }),
      );
    });
    it('should return 400 error when neither email nor mandaiId is provided', async () => {
      const result = await membershipService.checkUserMembership({
        group: 'wildpass',
        mid: true,
      });
      expect(result).toEqual({
        membership: {
          code: 400,
          mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_INVALID_INPUT',
          message: 'Email or Mandai ID is required.',
          email: '',
        },
        status: 'failed',
        statusCode: 400,
      });
    });
    it('should return group based on user without mid when cognito can found user', async () => {
      jest.spyOn(userModel, 'findPassesByUserEmailOrMandaiId').mockResolvedValue([]);
      jest.spyOn(cognitoService, 'cognitoAdminListGroupsForUser').mockResolvedValue({
        Groups: [
          {
            GroupName: 'wildpass',
          },
        ],
      });
      jest.spyOn(cognitoService, 'cognitoAdminGetUserByEmail').mockResolvedValue({
        UserAttributes: [
          {
            Name: 'custom:mandai_id',
            Value: '123',
          },
        ],
      });
      const rs = await membershipService.checkUserMembership({
        email: 'test-email@gmail.com',
        group: 'wildpass',
      });
      expect(rs).toEqual({
        membership: {
          group: {
            wildpass: true,
          },
          code: 200,
          message: 'Get membership success.',
          mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS',
          email: 'test-email@gmail.com',
        },
        status: 'success',
        statusCode: 200,
      });
    });
    it('should return group based on user with mid is true when cognito can found user', async () => {
      jest.spyOn(userModel, 'findPassesByUserEmailOrMandaiId').mockResolvedValue([]);
      jest.spyOn(cognitoService, 'cognitoAdminListGroupsForUser').mockResolvedValue({
        Groups: [
          {
            GroupName: 'wildpass',
          },
        ],
      });
      jest.spyOn(cognitoService, 'cognitoAdminGetUserByEmail').mockResolvedValue({
        UserAttributes: [
          {
            Name: 'custom:mandai_id',
            Value: '123',
          },
        ],
      });
      const rs = await membershipService.checkUserMembership({
        email: 'test-email@gmail.com',
        group: 'wildpass',
        mid: true,
      });
      expect(rs).toEqual({
        membership: {
          group: {
            wildpass: true,
          },
          code: 200,
          message: 'Get membership success.',
          mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS',
          email: 'test-email@gmail.com',
          mandaiId: '123',
        },
        status: 'success',
        statusCode: 200,
      });
    });
    it('should return group based on user with mid is true when user available at DB which belong wildpass', async () => {
      jest.spyOn(userModel, 'findPassesByUserEmailOrMandaiId').mockResolvedValue([
        {
          mandaiId: '123',
          id: '81',
          passes: 'fow',
          isBelong: 0,
        },
        {
          mandaiId: '123',
          id: '81',
          passes: 'wildpass',
          isBelong: 1,
        },
      ]);
      const rs = await membershipService.checkUserMembership({
        email: 'test-email@gmail.com',
        group: 'wildpass',
        mid: true,
      });
      expect(rs).toEqual({
        membership: {
          group: {
            wildpass: true,
          },
          code: 200,
          message: 'Get membership success.',
          mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS',
          email: 'test-email@gmail.com',
          mandaiId: '123',
        },
        status: 'success',
        statusCode: 200,
      });
    });
    it('should return group based on user with mid is true when user available at DB which belong membership-passes', async () => {
      jest.spyOn(userModel, 'findPassesByUserEmailOrMandaiId').mockResolvedValue([
        {
          mandaiId: '123',
          id: '81',
          passes: 'fow',
          isBelong: 1,
        },
        {
          mandaiId: '123',
          id: '81',
          passes: 'wildpass',
          isBelong: 0,
        },
      ]);
      const rs = await membershipService.checkUserMembership({
        email: 'test-email@gmail.com',
        group: 'membership-passes',
        mid: true,
      });
      expect(rs).toEqual({
        membership: {
          group: {
            'membership-passes': true,
          },
          code: 200,
          message: 'Get membership success.',
          mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS',
          email: 'test-email@gmail.com',
          mandaiId: '123',
        },
        status: 'success',
        statusCode: 200,
      });
    });
    it('should return group based on user with mid is true when user available at DB which not belong membership-passes', async () => {
      jest.spyOn(userModel, 'findPassesByUserEmailOrMandaiId').mockResolvedValue([
        {
          mandaiId: '123',
          id: '81',
          passes: 'wildpass',
          isBelong: 0,
        },
      ]);
      const rs = await membershipService.checkUserMembership({
        email: 'test-email@gmail.com',
        group: 'membership-passes',
        mid: true,
      });
      expect(rs).toEqual({
        membership: {
          group: {
            'membership-passes': false,
          },
          code: 200,
          message: 'Get membership success.',
          mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS',
          email: 'test-email@gmail.com',
          mandaiId: '123',
        },
        status: 'success',
        statusCode: 200,
      });
    });
  });
  describe('message multiple language', () => {
    it('multiple lang - should return group based on user with mid is true when user available at DB which belong wildpass', async () => {
      jest.spyOn(userModel, 'findPassesByUserEmailOrMandaiId').mockResolvedValue([
        {
          mandaiId: '123',
          id: '81',
          passes: 'fow',
          isBelong: 0,
        },
        {
          mandaiId: '123',
          id: '81',
          passes: 'wildpass',
          isBelong: 1,
        },
      ]);
      const rs = await membershipService.checkUserMembership({
        email: 'test-email@gmail.com',
        group: 'wildpass',
        mid: true,
        language: 'kr',
      });
      expect(rs).toEqual({
        membership: {
          group: {
            wildpass: true,
          },
          code: 200,
          message: '멤버십 획득 성공.',
          mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS',
          email: 'test-email@gmail.com',
          mandaiId: '123',
        },
        status: 'success',
        statusCode: 200,
      });
    });
  });
});
