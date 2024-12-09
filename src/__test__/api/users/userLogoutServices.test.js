const supportCognitoService = require("../../../api/supports/supportCognitoServices");
const usersService = require("../../../api/users/usersServices");
const cognitoService = require("../../../services/cognitoService");
const userCredentialModel = require("../../../db/models/userCredentialModel");
const userLogoutServices = require("../../../api/users/userLogoutServices");

jest.mock("../../../api/supports/supportCognitoServices", () => ({
  getUserCognitoInfoByAccessToken: jest.fn(),
}));
jest.mock("../../../db/models/userCredentialModel", () => ({
  findByUserEmail: jest.fn(),
  updateTokens: jest.fn(),
}));

describe("UserLogoutService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe("getUserEmailCognito", () => {
    it("should throw an error when user not found in Cognito", async () => {
      jest
        .spyOn(supportCognitoService, "getUserCognitoInfoByAccessToken")
        .mockResolvedValue({
          status: "failed",
        });
      const rs = await userLogoutServices.getUserEmailCognito("123avcd");
      expect(rs).toEqual("");
      expect(
        supportCognitoService.getUserCognitoInfoByAccessToken
      ).toBeCalledTimes(1);
    });
    it("should return user email if query cognito success", async () => {
      jest
        .spyOn(supportCognitoService, "getUserCognitoInfoByAccessToken")
        .mockResolvedValue({
          UserAttributes: [{ Name: "email", Value: "test-user@gmail.com" }],
        });
      const rs = await userLogoutServices.getUserEmailCognito("123avcd");
      expect(rs).toEqual("test-user@gmail.com");
      expect(
        supportCognitoService.getUserCognitoInfoByAccessToken
      ).toBeCalledTimes(1);
    });
  });
  describe("updateUser", () => {
    it("should throw an error when update process failed", async () => {
      jest
        .spyOn(userCredentialModel, "updateTokens")
        .mockRejectedValue("update db failed");
      const rs = await userLogoutServices.updateUser(1);
      expect(rs).toEqual({
        message: '"update db failed"',
      });
      expect(userCredentialModel.updateTokens).toBeCalledTimes(1);
    });
    it("should return success when update process finish", async () => {
      jest.spyOn(userCredentialModel, "updateTokens").mockResolvedValue({
        fieldCount: 0,
        affectedRows: 1,
        insertId: 0,
        info: "Rows matched: 1  Changed: 1  Warnings: 0",
        serverStatus: 2,
        warningStatus: 0,
        changedRows: 1,
      });
      const rs = await userLogoutServices.updateUser(1);
      expect(rs).toEqual({
        message: "success",
      });
    });
  });
  describe("execute", () => {
    it("throw error when getUserEmailCognito failed", async () => {
      jest
        .spyOn(supportCognitoService, "getUserCognitoInfoByAccessToken")
        .mockResolvedValue({
          status: "failed",
        });
      const rs = await userLogoutServices.execute("123bascs");
      expect(rs).toEqual({
        errorMessage: "Logout Failed",
      });
    });
    it("throw error when findByUserEmail failed", async () => {
      jest
        .spyOn(supportCognitoService, "getUserCognitoInfoByAccessToken")
        .mockResolvedValue({
          UserAttributes: [{ Name: "email", Value: "test-user@gmail.com" }],
        });
      jest.spyOn(userCredentialModel, "findByUserEmail").mockResolvedValue({
        id: "",
      });
      const rs = await userLogoutServices.execute("123asde");
      expect(rs).toEqual({
        errorMessage: "Logout Failed",
      });
    });
    it("throw error when logout cognito failed", async () => {
      jest
        .spyOn(supportCognitoService, "getUserCognitoInfoByAccessToken")
        .mockResolvedValue({
          UserAttributes: [{ Name: "email", Value: "test-user@gmail.com" }],
        });
      jest.spyOn(userCredentialModel, "findByUserEmail").mockResolvedValue({
        id: "1",
      });
      jest.spyOn(cognitoService, "cognitoUserLogout").mockResolvedValue({
        message: "failed",
      });
      const rs = await userLogoutServices.execute("123asdw");
      expect(rs).toEqual({
        errorMessage: "failed",
      });
    });
    it("throw error when updateToken failed", async () => {
      jest
        .spyOn(supportCognitoService, "getUserCognitoInfoByAccessToken")
        .mockResolvedValue({
          UserAttributes: [{ Name: "email", Value: "test-user@gmail.com" }],
        });
      jest.spyOn(userCredentialModel, "findByUserEmail").mockResolvedValue({
        id: "1",
      });
      jest.spyOn(cognitoService, "cognitoUserLogout").mockResolvedValue({
        message: "success",
      });
      jest
        .spyOn(userCredentialModel, "updateTokens")
        .mockRejectedValue("update db failed");
      const rs = await userLogoutServices.execute("123asdw");
      expect(rs).toEqual({
        errorMessage: '"update db failed"',
      });
    });
    it("should return message success when execute process success", async () => {
      jest
        .spyOn(supportCognitoService, "getUserCognitoInfoByAccessToken")
        .mockResolvedValue({
          UserAttributes: [{ Name: "email", Value: "test-user@gmail.com" }],
        });
      jest.spyOn(userCredentialModel, "findByUserEmail").mockResolvedValue({
        id: "1",
      });
      jest.spyOn(cognitoService, "cognitoUserLogout").mockResolvedValue({
        message: "success",
      });
      jest.spyOn(userCredentialModel, "updateTokens").mockResolvedValue({
        message: "success",
      });
      const rs = await userLogoutServices.execute("123bsdew");
      expect(rs).toEqual({
        message: "Logout successfully",
      });
    });
  });
});
