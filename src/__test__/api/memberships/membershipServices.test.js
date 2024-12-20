const cognitoService = require("../../../services/cognitoService");
const membershipService = require("../../../api/memberships/membershipsServices");

jest.mock("../../../services/cognitoService", () => ({
  cognitoAdminGetUserByEmail: jest.fn(),
}));

describe("MembershipService", () => {
  describe("checkUserMembership", () => {
    it("should throw error MWG_CIAM_USERS_MEMBERSHIP_NULL when cognito not found user", async () => {
      jest
        .spyOn(cognitoService, "cognitoAdminGetUserByEmail")
        .mockRejectedValue(
          new Error(
            JSON.stringify({
              status: "failed",
            })
          )
        );
      await expect(
        membershipService.checkUserMembership({
          email: "test-email@gmail.com",
          group: "wildpass",
        })
      ).rejects.toThrow(
        JSON.stringify({
          membership: {
            code: 200,
            mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_NULL",
            message: "No record found.",
            email: "test-email@gmail.com",
          },
          status: "success",
          statusCode: 200,
        })
      );
    });
    it("should return MWG_CIAM_USERS_MEMBERSHIP_SUCCESS when cognito not get value membership", async () => {
      jest.spyOn(cognitoService, "cognitoAdminGetUserByEmail").mockResolvedValue({
        UserAttributes: [
          {
            Name: "custom:membership",
          },
        ],
      });
      const rs = await membershipService.checkUserMembership({
        email: "test-email@gmail.com",
        group: "wildpass",
      });
      expect(rs).toEqual({
        membership: {
          group: {
            wildpass: false,
          },
          code: 200,
          message: "Get membership success.",
          mwgCode: "MWG_CIAM_USERS_MEMBERSHIP_SUCCESS",
          email: "test-email@gmail.com",
        },
        status: "success",
        statusCode: 200,
      });
    });
    it("should return MWG_CIAM_USERS_MEMBERSHIP_SUCCESS when cognito have user member group but not belong any group", async () => {
      jest.spyOn(cognitoService, "cognitoAdminGetUserByEmail").mockResolvedValue({
        UserAttributes: [
          {
            Name: "custom:membership",
            Value:
              '[{"name":"wildpass1","visualID":"","expiry":""},{"name":"fow","visualID":"","expiry":"08/12/2025"},{"name":"fow+","visualID":"","expiry":"23/12/2025"}]',
          },
        ],
      });
      const rs = await membershipService.checkUserMembership({
        email: "test-email@gmail.com",
        group: "wildpass",
      });
      expect(rs).toEqual({
        membership: {
          group: {
            wildpass: false,
          },
          code: 200,
          mwgCode: "MWG_CIAM_USERS_MEMBERSHIP_SUCCESS",
          message: "Get membership success.",
          email: "test-email@gmail.com",
        },
        status: "success",
        statusCode: 200,
      });
    });
    it("should return MWG_CIAM_USERS_MEMBERSHIP_SUCCESS when cognito have user member group fow/fow+", async () => {
      jest.spyOn(cognitoService, "cognitoAdminGetUserByEmail").mockResolvedValue({
        UserAttributes: [
          {
            Name: "custom:membership",
            Value:
              '[{"name":"wildpass1","visualID":"","expiry":""},{"name":"fow","visualID":"","expiry":"08/12/2025"},{"name":"fow+","visualID":"","expiry":"23/12/2025"}]',
          },
        ],
      });
      const rs = await membershipService.checkUserMembership({
        email: "test-email@gmail.com",
        group: "fow",
      });
      expect(rs).toEqual({
        membership: {
          group: {
            fow: true,
          },
          code: 200,
          mwgCode: "MWG_CIAM_USERS_MEMBERSHIP_SUCCESS",
          message: "Get membership success.",
          email: "test-email@gmail.com",
        },
        status: "success",
        statusCode: 200,
      });
    });
    it("should return MWG_CIAM_USERS_MEMBERSHIP_SUCCESS when cognito have user member group fow/fow+ but group request is wildpass", async () => {
      jest.spyOn(cognitoService, "cognitoAdminGetUserByEmail").mockResolvedValue({
        UserAttributes: [
          {
            Name: "custom:membership",
            Value:
              '[{"name":"fow","visualID":"","expiry":"08/12/2025"},{"name":"fow+","visualID":"","expiry":"23/12/2025"}]',
          },
        ],
      });
      const rs = await membershipService.checkUserMembership({
        email: "test-email@gmail.com",
        group: "wildpass",
      });
      expect(rs).toEqual({
        membership: {
          group: {
            wildpass: false,
          },
          code: 200,
          mwgCode: "MWG_CIAM_USERS_MEMBERSHIP_SUCCESS",
          message: "Get membership success.",
          email: "test-email@gmail.com",
        },
        status: "success",
        statusCode: 200,
      });
    });
  });
  describe("message multiple language", () => {
    it("should return MWG_CIAM_USERS_MEMBERSHIP_SUCCESS default language (EN)", async () => {
      jest.spyOn(cognitoService, "cognitoAdminGetUserByEmail").mockResolvedValue({
        UserAttributes: [
          {
            Name: "custom:membership",
            Value:
              '[{"name":"fow","visualID":"","expiry":"08/12/2025"},{"name":"fow+","visualID":"","expiry":"23/12/2025"}]',
          },
        ],
      });
      const rs = await membershipService.checkUserMembership({
        email: "test-email@gmail.com",
        group: "wildpass",
      });
      expect(rs).toEqual({
        membership: {
          group: {
            wildpass: false,
          },
          code: 200,
          mwgCode: "MWG_CIAM_USERS_MEMBERSHIP_SUCCESS",
          message: "Get membership success.",
          email: "test-email@gmail.com",
        },
        status: "success",
        statusCode: 200,
      });
    });
    it("should return MWG_CIAM_USERS_MEMBERSHIP_SUCCESS based on country JP", async () => {
      jest.spyOn(cognitoService, "cognitoAdminGetUserByEmail").mockResolvedValue({
        UserAttributes: [
          {
            Name: "custom:membership",
            Value:
              '[{"name":"fow","visualID":"","expiry":"08/12/2025"},{"name":"fow+","visualID":"","expiry":"23/12/2025"}]',
          },
        ],
      });
      const rs = await membershipService.checkUserMembership({
        email: "test-email@gmail.com",
        group: "wildpass",
        language: "ja",
      });
      expect(rs).toEqual({
        membership: {
          group: {
            wildpass: false,
          },
          code: 200,
          mwgCode: "MWG_CIAM_USERS_MEMBERSHIP_SUCCESS",
          message: "メンバーシップ取得成功.",
          email: "test-email@gmail.com",
        },
        status: "success",
        statusCode: 200,
      });
    });
    it("should return MWG_CIAM_USERS_MEMBERSHIP_SUCCESS default language (EN) when request language not setup", async () => {
      jest.spyOn(cognitoService, "cognitoAdminGetUserByEmail").mockResolvedValue({
        UserAttributes: [
          {
            Name: "custom:membership",
            Value:
              '[{"name":"fow","visualID":"","expiry":"08/12/2025"},{"name":"fow+","visualID":"","expiry":"23/12/2025"}]',
          },
        ],
      });
      const rs = await membershipService.checkUserMembership({
        email: "test-email@gmail.com",
        group: "wildpass",
        language: "ab",
      });
      expect(rs).toEqual({
        membership: {
          group: {
            wildpass: false,
          },
          code: 200,
          mwgCode: "MWG_CIAM_USERS_MEMBERSHIP_SUCCESS",
          message: "Get membership success.",
          email: "test-email@gmail.com",
        },
        status: "success",
        statusCode: 200,
      });
    });
  });
});
