const cognitoService = require("../../../services/cognitoService");
const userCredentialModel = require("../../../db/models/userCredentialModel");
const userLogoutServices = require("../../../api/users/userLogoutServices");

jest.mock("../../../services/cognitoService", () => ({
  cognitoUserLogout: jest.fn(),
  cognitoAdminGetUserByAccessToken: jest.fn(),
}));
jest.mock("../../../db/models/userCredentialModel", () => ({
  updateTokens: jest.fn(),
  findByUserEmail: jest.fn(),
}));

describe("UserLogoutService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe("getUser", () => {
    it("should throw an error when user not found in Cognito", async () => {
      jest
        .spyOn(cognitoService, "cognitoAdminGetUserByAccessToken")
        .mockRejectedValue({
          status: "failed",
        });
      await expect(userLogoutServices.getUser("123")).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_NULL",
              message: "No record found.",
            },
            status: "success",
            statusCode: 200,
          })
        )
      );
    });
    it("should throw an error when user not found in db", async () => {
      jest
        .spyOn(cognitoService, "cognitoAdminGetUserByAccessToken")
        .mockResolvedValue({
          UserAttributes: [
            {
              Name: "email",
              Value: "test@gmail.com",
            },
          ],
        });
      jest
        .spyOn(userCredentialModel, "findByUserEmail")
        .mockResolvedValue(undefined);
      await expect(userLogoutServices.getUser("123")).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_NULL",
              message: "No record found.",
            },
            status: "success",
            statusCode: 200,
          })
        )
      );
    });
    it("return user info when user exists", async () => {
      jest
        .spyOn(cognitoService, "cognitoAdminGetUserByAccessToken")
        .mockResolvedValue({
          UserAttributes: [{ Name: "email", Value: "test@gmail.com" }],
        });
      jest.spyOn(userCredentialModel, "findByUserEmail").mockResolvedValue({
        user_id: "1",
      });
      const rs = await userLogoutServices.getUser("123");
      expect(rs).toEqual({
        email: "test@gmail.com",
        userId: "1",
      });
    });
  });
  describe("execute", () => {
    it("throw error when getUser failed", async () => {
      jest
        .spyOn(cognitoService, "cognitoAdminGetUserByAccessToken")
        .mockRejectedValue({
          status: "failed",
        });
      await expect(userLogoutServices.execute("123")).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_NULL",
              message: "No record found.",
            },
            status: "success",
            statusCode: 200,
          })
        )
      );
    });
    it("throw error when logout failed", async () => {
      jest.spyOn(userLogoutServices, "getUser").mockImplementationOnce(() => {
        return {
          email: "test@gmail.com",
          userId: "2",
        };
      });
      jest
        .spyOn(cognitoService, "cognitoUserLogout")
        .mockRejectedValue(new Error(JSON.stringify({ status: "failed" })));
      await expect(userLogoutServices.execute("123")).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 500,
              mwgCode: "MWG_CIAM_INTERNAL_SERVER_ERROR",
              message: "Internal Server Error",
            },
            status: "failed",
            statusCode: 500,
          })
        )
      );
    });
    it("throw error when updateUser failed", async () => {
      jest.spyOn(userLogoutServices, "getUser").mockImplementationOnce(() => {
        return {
          email: "test@gmail.com",
          userId: "2",
        };
      });
      jest
        .spyOn(userCredentialModel, "updateTokens")
        .mockRejectedValue("update db failed");
      await expect(
        userLogoutServices.execute('123')
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 500,
              mwgCode: "MWG_CIAM_INTERNAL_SERVER_ERROR",
              message: "Internal Server Error",
            },
            status: "failed",
            statusCode: 500,
          })
        )
      );
    });
    it("should return user when execute process success", async () => {
      jest.spyOn(userLogoutServices, "getUser").mockImplementationOnce(() => {
        return {
          email: "test@gmail.com",
          userId: "2",
        };
      });
        jest.spyOn(cognitoService, "cognitoUserLogout").mockResolvedValue('success');
      jest
        .spyOn(userCredentialModel, "updateTokens")
        .mockResolvedValue("update db success");
      const rs = await userLogoutServices.execute('123');
      expect(rs).toEqual({
        email: "test@gmail.com",
      });
    });
  });
});
