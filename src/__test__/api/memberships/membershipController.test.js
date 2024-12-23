const membershipService = require("../../../api/memberships/membershipsServices");
const membershipsController = require("../../../api/memberships/membershipsControllers");

jest.mock("../../../api/memberships/membershipsServices", () => ({
  checkUserMembership: jest.fn(),
  processResponse: jest.fn(),
  checkUserMembershipAEM: jest.fn(),
}));
// jest.mock("../../../api/memberships/membershipsControllers")

describe("MembershipController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe("adminGetUser", () => {
    it("should throw error MWG_CIAM_PARAMS_ERR when request over parameters", async () => {
      jest.spyOn(membershipService, "processResponse").mockReturnValue({
        membership: {
          code: 400,
          mwgCode: "MWG_CIAM_PARAMS_ERR",
          message: "Wrong parameters.",
        },
        status: "failed",
        statusCode: 400,
      });
      const rs = await membershipsController.adminGetUser({
        email: "test-email@gmail.com",
        group: "wildpass",
        language: "ab",
        test: "12",
      });
      expect(rs).toEqual({
        membership: {
          code: 400,
          mwgCode: "MWG_CIAM_PARAMS_ERR",
          message: "Wrong parameters.",
        },
        status: "failed",
        statusCode: 400,
      });
      expect(membershipService.processResponse).toBeCalledTimes(1);
    });
    it("should throw error MWG_CIAM_PARAMS_ERR when email not exists", async () => {
      jest.spyOn(membershipService, "processResponse").mockReturnValue({
        membership: {
          code: 400,
          mwgCode: "MWG_CIAM_PARAMS_ERR",
          message: "Wrong parameters.",
        },
        status: "failed",
        statusCode: 400,
      });
      const rs = await membershipsController.adminGetUser({
        email: "",
        group: "wildpass",
        language: "ab",
      });
      expect(rs).toEqual({
        membership: {
          code: 400,
          mwgCode: "MWG_CIAM_PARAMS_ERR",
          message: "Wrong parameters.",
        },
        status: "failed",
        statusCode: 400,
      });
      expect(membershipService.processResponse).toBeCalledTimes(1);
    });
    it("should throw error MWG_CIAM_PARAMS_ERR when group not exists", async () => {
      jest.spyOn(membershipService, "processResponse").mockReturnValue({
        membership: {
          code: 400,
          mwgCode: "MWG_CIAM_PARAMS_ERR",
          message: "Wrong parameters.",
        },
        status: "failed",
        statusCode: 400,
      });
      const rs = await membershipsController.adminGetUser({
        email: "test-email@gmail.com",
        group: "",
        language: "ab",
      });
      expect(rs).toEqual({
        membership: {
          code: 400,
          mwgCode: "MWG_CIAM_PARAMS_ERR",
          message: "Wrong parameters.",
        },
        status: "failed",
        statusCode: 400,
      });
      expect(membershipService.processResponse).toBeCalledTimes(1);
    });
    it("should throw error MWG_CIAM_PARAMS_ERR when group not allow", async () => {
      jest.spyOn(membershipService, "processResponse").mockReturnValue({
        membership: {
          code: 400,
          mwgCode: "MWG_CIAM_PARAMS_ERR",
          message: "Wrong parameters.",
        },
        status: "failed",
        statusCode: 400,
      });
      const rs = await membershipsController.adminGetUser({
        email: "test-email@gmail.com",
        group: "wildpass1",
        language: "ab",
      });
      expect(rs).toEqual({
        membership: {
          code: 400,
          mwgCode: "MWG_CIAM_PARAMS_ERR",
          message: "Wrong parameters.",
        },
        status: "failed",
        statusCode: 400,
      });
      expect(membershipService.processResponse).toBeCalledTimes(1);
    });
    it("should return MWG_CIAM_USERS_MEMBERSHIPS_NULL when checkUserMembership not found record", async () => {
      jest
        .spyOn(membershipService, "checkUserMembership")
        .mockRejectedValue(
          new Error(
            JSON.stringify({
              membership: {
                code: 200,
                mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_NULL",
                message: "No record found.",
                email: "test-email@gmail.com",
              },
              status: "failed",
              statusCode: 200,
            })
          )
        );
      await expect(
        membershipsController.adminGetUser({
          email: "test-email@gmail.com",
          group: "wildpass",
        })
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_NULL",
              message: "No record found.",
              email: "test-email@gmail.com",
            },
            status: "failed",
            statusCode: 200,
          })
        )
      );
    });
    it("should return MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS when checkUserMembership can check group belong wildpass", async () => {
      jest
        .spyOn(membershipService, "checkUserMembership")
        .mockResolvedValue({
          membership: {
            group: {
              wildpass: true,
            },
            code: 200,
            mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS",
            message: "Get membership success.",
            email: "test-email@gmail.com",
          },
          status: "success",
          statusCode: 200,
        });
      const rs = await membershipsController.adminGetUser({
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
          message: "Get membership success.",
          email: "test-email@gmail.com",
        },
        status: "success",
        statusCode: 200,
      });
    });
    it("should return MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS when checkUserMembership can check group belong fow/fow+", async () => {
      jest
        .spyOn(membershipService, "checkUserMembership")
        .mockResolvedValue({
          membership: {
            group: {
              "fow+": true,
            },
            code: 200,
            mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS",
            message: "Get membership success.",
            email: "test-email@gmail.com",
          },
          status: "success",
          statusCode: 200,
        });
      const rs = await membershipsController.adminGetUser({
        email: "test-email@gmail.com",
        group: "fow+",
      });
      expect(rs).toEqual({
        membership: {
          group: {
            "fow+": true,
          },
          code: 200,
          mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS",
          message: "Get membership success.",
          email: "test-email@gmail.com",
        },
        status: "success",
        statusCode: 200,
      });
    });
    it("should return MWG_CIAM_USERS_MEMBERSHIPS_NULL calling checkAEM when checkUserMembership have no record and request checking group is wildpass", async () => {
      jest
        .spyOn(membershipService, "checkUserMembership")
        .mockResolvedValue({
          membership: {
            code: 200,
            mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_NULL",
            message: "No record found.",
            email: "test-email@gmail.com",
          },
          status: "failed",
          statusCode: 200,
        });

      jest
        .spyOn(membershipService, "checkUserMembershipAEM")
        .mockResolvedValue("");
      const rs = await membershipsController.adminGetUser({
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
  });
});
