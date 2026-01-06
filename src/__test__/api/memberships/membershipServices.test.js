const cognitoService = require('../../../services/cognitoService');
const membershipService = require('../../../api/memberships/membershipsServices');
const userModel = require('../../../db/models/userModel');

jest.mock('../../../services/cognitoService', () => ({
  cognitoAdminListGroupsForUser: jest.fn(),
  cognitoAdminGetUserByEmail: jest.fn(),
}));
jest.mock('../../../db/models/userModel', () => ({
  findPassesByUserEmailOrMandaiId: jest.fn(),
  findByEmailOrMandaiId: jest.fn(),
}));

describe('MembershipService', () => {
  describe('checkUserMembership', () => {
    it('should return MWG_CIAM_USERS_MEMBERSHIPS_NULL when user not found in DB', async () => {
      jest.spyOn(userModel, 'findPassesByUserEmailOrMandaiId').mockResolvedValue([]);
      jest.spyOn(userModel, 'findByEmailOrMandaiId').mockResolvedValue(null);
      const result = await membershipService.checkUserMembership({
        email: 'test-email@gmail.com',
        group: 'wildpass',
      });
      expect(result).toEqual({
        membership: {
          code: 200,
          mwgCode: 'MWG_CIAM_USERS_MEMBERSHIPS_NULL',
          message: 'No record found.',
          email: 'test-email@gmail.com',
        },
        status: 'failed',
        statusCode: 200,
      });
    });
    it('should return group based on user without mid when cognito can found user', async () => {
      jest.spyOn(userModel, 'findPassesByUserEmailOrMandaiId').mockResolvedValue([]);
      jest.spyOn(userModel, 'findByEmailOrMandaiId').mockResolvedValue({
        email: 'test-email@gmail.com',
        mandai_id: '123',
      });
      jest.spyOn(cognitoService, 'cognitoAdminListGroupsForUser').mockResolvedValue({
        Groups: [
          {
            GroupName: 'wildpass',
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
      jest.spyOn(userModel, 'findByEmailOrMandaiId').mockResolvedValue({
        email: 'test-email@gmail.com',
        mandai_id: '123',
      });
      jest.spyOn(cognitoService, 'cognitoAdminListGroupsForUser').mockResolvedValue({
        Groups: [
          {
            GroupName: 'wildpass',
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
      jest.spyOn(userModel, 'findByEmailOrMandaiId').mockResolvedValue({
        email: 'test-email@gmail.com',
        mandai_id: '123',
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
      jest.spyOn(userModel, 'findByEmailOrMandaiId').mockResolvedValue({
        email: 'test-email@gmail.com',
        mandai_id: '123',
      });
      jest.spyOn(cognitoService, 'cognitoAdminListGroupsForUser').mockResolvedValue({
        Groups: [{ GroupName: 'membership-passes' }],
      });
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
      jest.spyOn(userModel, 'findByEmailOrMandaiId').mockResolvedValue({
        email: 'test-email@gmail.com',
        mandai_id: '123',
      });
      jest.spyOn(cognitoService, 'cognitoAdminListGroupsForUser').mockResolvedValue({
        Groups: [],
      });
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
      jest.spyOn(userModel, 'findByEmailOrMandaiId').mockResolvedValue({
        email: 'test-email@gmail.com',
        mandai_id: '123',
      });
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
