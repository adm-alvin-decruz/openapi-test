const cognitoService = require("../../../services/cognitoService");
const membershipService = require("../../../api/memberships/membershipsServices");

jest.mock("../../../services/cognitoService", () => ({
  cognitoAdminGetUser: jest.fn(),
}));

describe("MembershipService", () => {
  describe("checkUserMembershipCognito", () => {
    it("should throw error MWG_CIAM_USERS_MEMBERSHIPS_NULL when cognito not found user", async () => {
      jest
        .spyOn(cognitoService, "cognitoAdminGetUser")
        .mockResolvedValue({
          status: "failed",
        });
      const rs = await membershipService.checkUserMembershipCognito({
        email: "test-email@gmail.com",
        group: "wildpass",
      });
      expect(rs).toEqual({
        membership: {
          code: 200,
          mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_NULL",
          message: "No record found.",
          email: "test-email@gmail.com",
        },
        status: "failed",
        statusCode: 200,
      });
    });
    it("should return MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS when cognito not set user member group", async () => {
      jest
        .spyOn(cognitoService, "cognitoAdminGetUser")
        .mockResolvedValue({
          UserAttributes: [
            {
              Name: "custom:membership",
            },
          ],
        });
      const rs = await membershipService.checkUserMembershipCognito({
        email: "test-email@gmail.com",
        group: "wildpass",
      });
      expect(rs).toEqual({
        membership: {
          group: {
            wildpass: false,
          },
          code: 200,
          mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS",
          message: "Get memberships success.",
          email: "test-email@gmail.com",
        },
        status: "success",
        statusCode: 200,
      });
    });
    it("should return MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS when cognito have user member group", async () => {
      jest
        .spyOn(cognitoService, "cognitoAdminGetUser")
        .mockResolvedValue({
          UserAttributes: [
            {
              Name: "custom:membership",
              Value:
                '[{"name":"wildpass1","visualID":"","expiry":""},{"name":"fow","visualID":"","expiry":"08/12/2025"},{"name":"fow+","visualID":"","expiry":"23/12/2025"}]',
            },
          ],
        });
      const rs = await membershipService.checkUserMembershipCognito({
        email: "test-email@gmail.com",
        group: "wildpass",
      });
      expect(rs).toEqual({
        membership: {
          group: {
            wildpass: true,
          },
          code: 200,
          mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS",
          message: "Get memberships success.",
          email: "test-email@gmail.com",
        },
        status: "success",
        statusCode: 200,
      });
    });
    it("should return MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS when cognito have user member group fow/fow+", async () => {
      jest
        .spyOn(cognitoService, "cognitoAdminGetUser")
        .mockResolvedValue({
          UserAttributes: [
            {
              Name: "custom:membership",
              Value:
                '[{"name":"wildpass1","visualID":"","expiry":""},{"name":"fow","visualID":"","expiry":"08/12/2025"},{"name":"fow+","visualID":"","expiry":"23/12/2025"}]',
            },
          ],
        });
      const rs = await membershipService.checkUserMembershipCognito({
        email: "test-email@gmail.com",
        group: "fow",
      });
      expect(rs).toEqual({
        membership: {
          group: {
            fow: true,
          },
          code: 200,
          mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS",
          message: "Get memberships success.",
          email: "test-email@gmail.com",
        },
        status: "success",
        statusCode: 200,
      });
    });
    it("should return MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS when cognito have user member group fow/fow+ but group request is wildpass", async () => {
      jest
        .spyOn(cognitoService, "cognitoAdminGetUser")
        .mockResolvedValue({
          UserAttributes: [
            {
              Name: "custom:membership",
              Value:
                '[{"name":"fow","visualID":"","expiry":"08/12/2025"},{"name":"fow+","visualID":"","expiry":"23/12/2025"}]',
            },
          ],
        });
      const rs = await membershipService.checkUserMembershipCognito({
        email: "test-email@gmail.com",
        group: "wildpass",
      });
      expect(rs).toEqual({
        membership: {
          group: {
            wildpass: false,
          },
          code: 200,
          mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS",
          message: "Get memberships success.",
          email: "test-email@gmail.com",
        },
        status: "success",
        statusCode: 200,
      });
    });
  });
  describe("message multiple language", () => {
    it("should return MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS default language (EN)", async () => {
      jest
        .spyOn(cognitoService, "cognitoAdminGetUser")
        .mockResolvedValue({
          UserAttributes: [
            {
              Name: "custom:membership",
              Value:
                '[{"name":"fow","visualID":"","expiry":"08/12/2025"},{"name":"fow+","visualID":"","expiry":"23/12/2025"}]',
            },
          ],
        });
      const rs = await membershipService.checkUserMembershipCognito({
        email: "test-email@gmail.com",
        group: "wildpass",
      });
      expect(rs).toEqual({
        membership: {
          group: {
            wildpass: false,
          },
          code: 200,
          mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS",
          message: "Get memberships success.",
          email: "test-email@gmail.com",
        },
        status: "success",
        statusCode: 200,
      });
    });
    it("should return MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS based on country JP", async () => {
      jest
        .spyOn(cognitoService, "cognitoAdminGetUser")
        .mockResolvedValue({
          UserAttributes: [
            {
              Name: "custom:membership",
              Value:
                '[{"name":"fow","visualID":"","expiry":"08/12/2025"},{"name":"fow+","visualID":"","expiry":"23/12/2025"}]',
            },
          ],
        });
      const rs = await membershipService.checkUserMembershipCognito({
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
          mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS",
          message: "メンバーシップを成功させましょう。",
          email: "test-email@gmail.com",
        },
        status: "success",
        statusCode: 200,
      });
    });
    it("should return MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS default language (EN) when request language not setup", async () => {
      jest
        .spyOn(cognitoService, "cognitoAdminGetUser")
        .mockResolvedValue({
          UserAttributes: [
            {
              Name: "custom:membership",
              Value:
                '[{"name":"fow","visualID":"","expiry":"08/12/2025"},{"name":"fow+","visualID":"","expiry":"23/12/2025"}]',
            },
          ],
        });
      const rs = await membershipService.checkUserMembershipCognito({
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
          mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS",
          message: "Get memberships success.",
          email: "test-email@gmail.com",
        },
        status: "success",
        statusCode: 200,
      });
    });
  });
});
