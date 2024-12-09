const SupportUserServices = require("../../../api/supports/supportUserServices");
const usersService = require("../../../api/users/usersServices");
const cognitoService = require("../../../services/cognitoService");
const userCredentialModel = require("../../../db/models/userCredentialModel");
const userLoginServices = require("../../../api/users/userLoginServices");

jest.mock("../../../api/users/usersServices", () => ({
  genSecretHash: jest.fn(),
}));
jest.mock("../../../services/cognitoService", () => ({
  cognitoUserLogin: jest.fn(),
}));
jest.mock("../../../api/supports/supportUserServices", () => ({
  getUserAllInfoService: jest.fn(),
}));
jest.mock("../../../db/models/userCredentialModel", () => ({
  updateTokens: jest.fn(),
}));

describe("UserLoginService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe("login", () => {
    it("should throw an error when failed login Cognito", async () => {
      const result = [];
      result["cognitoLoginError"] = "Login Cognito Error";
      jest
        .spyOn(usersService, "genSecretHash")
        .mockReturnValue("example-hash-secret");
      jest.spyOn(cognitoService, "cognitoUserLogin").mockResolvedValue(result);
      const rs = await userLoginServices.login({
        body: {
          email: "example-email@gmail.com",
          password: "123",
        },
      });
      expect(rs).toEqual({
        errorMessage: "Login Cognito Error",
      });
      expect(usersService.genSecretHash).toBeCalledTimes(1);
    });
    it("should return login session when login cognito success", async () => {
      const result = [];
      result["cognitoLoginResult"] = {
        accessToken: "accessToken-example",
        refreshToken: "refreshToken-example",
        idToken: "idToken-example",
      };
      jest.spyOn(usersService, "genSecretHash");
      jest.spyOn(cognitoService, "cognitoUserLogin").mockResolvedValue(result);
      const rs = await userLoginServices.login({
        body: {
          email: "example-email@gmail.com",
          password: "123",
        },
      });
      expect(rs).toEqual({
        accessToken: "accessToken-example",
        refreshToken: "refreshToken-example",
        idToken: "idToken-example",
      });
      expect(usersService.genSecretHash).toBeCalledTimes(1);
    });
  });
  describe("getUser", () => {
    it("should throw an error when user not found in Cognito", async () => {
      jest
        .spyOn(SupportUserServices, "getUserAllInfoService")
        .mockResolvedValue({
          db: {
            username: "test-user",
          },
          cognito: {
            status: "not found",
          },
        });
      const rs = await userLoginServices.getUser({
        body: {
          email: "example-email@gmail.com",
          password: "123",
        },
      });
      expect(rs).toEqual({
        errorMessage: "User not exist",
      });
      expect(SupportUserServices.getUserAllInfoService).toBeCalledTimes(1);
    });
    it("should throw an error when user not found in db", async () => {
      jest
        .spyOn(SupportUserServices, "getUserAllInfoService")
        .mockResolvedValue({
          db: null,
          cognito: {
            status: "user not found",
          },
        });
      const rs = await userLoginServices.getUser({
        body: {
          email: "example-email@gmail.com",
          password: "123",
        },
      });
      expect(rs).toEqual({
        errorMessage: "User not exist",
      });
      expect(SupportUserServices.getUserAllInfoService).toBeCalledTimes(1);
    });
    it("should return user info if query success", async () => {
      jest
        .spyOn(SupportUserServices, "getUserAllInfoService")
        .mockResolvedValue({
          db: {
            username: "test-user",
          },
          cognito: {
            UserCreateDate: "2024-12-06T13:16:06.189Z",
            UserLastModifiedDate: "2024-12-09T07:51:31.003Z",
            UserStatus: "CONFIRMED",
            Username: "1",
            UserAttributes: [
              { Name: "sub", Value: "1" },
              { Name: "birthdate", Value: "03/05/1997" },
              { Name: "custom:vehicle_iu", Value: "null" },
              {
                Name: "preferred_username",
                Value: "test-user@gmail.com",
              },
              { Name: "custom:visual_id", Value: "null" },
              { Name: "custom:vehicle_plate", Value: "null" },
              { Name: "updated_at", Value: "1733490966" },
              { Name: "email", Value: "test-user@gmail.com" },
              { Name: "custom:terms_conditions", Value: "null" },
              { Name: "custom:source", Value: "ORGANIC" },
              { Name: "email_verified", Value: "true" },
              { Name: "given_name", Value: "test" },
              {
                Name: "custom:membership",
                Value:
                  '[{"name":"group1","visualID":"","expiry":""},{"name":"group2","visualID":"","expiry":"08/12/2025"},{"name":"group+","visualID":"","expiry":"23/12/2025"}]',
              },
              { Name: "custom:mandai_id", Value: "123" },
              { Name: "name", Value: "Test User" },
              { Name: "custom:last_login", Value: "null" },
              { Name: "family_name", Value: "Test" },
            ],
          },
        });
      const rs = await userLoginServices.getUser({
        body: {
          email: "test-user@gmail.com",
          password: "123",
        },
      });
      expect(rs).toEqual({
        db: {
          username: "test-user",
        },
        cognito: {
          sub: "1",
          birthdate: "03/05/1997",
          vehicle_iu: "null",
          preferred_username: "test-user@gmail.com",
          visual_id: "null",
          vehicle_plate: "null",
          updated_at: "1733490966",
          email: "test-user@gmail.com",
          terms_conditions: "null",
          source: "ORGANIC",
          email_verified: "true",
          given_name: "test",
          membership: [
            {
              name: "group1",
              visualID: "",
              expiry: "",
            },
            {
              name: "group2",
              visualID: "",
              expiry: "08/12/2025",
            },
            {
              name: "group+",
              visualID: "",
              expiry: "23/12/2025",
            },
          ],
          mandai_id: "123",
          name: "Test User",
          last_login: "null",
          family_name: "Test",
          createdAt: "2024-12-06T13:16:06.189Z",
          updatedAt: "2024-12-09T07:51:31.003Z",
          status: "CONFIRMED",
          id: "1",
        },
      });
      expect(SupportUserServices.getUserAllInfoService).toBeCalledTimes(1);
    });
  });
  describe("updateUser", () => {
    it("should throw an error when update process failed", async () => {
      jest
        .spyOn(userCredentialModel, "updateTokens")
        .mockRejectedValue("update db failed");
      const rs = await userLoginServices.updateUser(1, {
        accessToken: "example-token",
        refreshToken: "refresh-token",
        idToken: "id-token",
      });
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
      const rs = await userLoginServices.updateUser(1, {
        accessToken: "example-token",
        refreshToken: "refresh-token",
        idToken: "id-token",
      });
      expect(rs).toEqual({
        message: "success",
      });
    });
  });
  describe("execute", () => {
    it("throw error when getUserInfo failed", async () => {
      jest
        .spyOn(SupportUserServices, "getUserAllInfoService")
        .mockResolvedValue({
          db: {
            username: "test-user",
          },
          cognito: {
            status: "not found",
          },
        });
      const rs = await userLoginServices.execute({
        body: {
          email: "test-email@gmail.com",
          password: "123",
        },
      });
      expect(rs).toEqual({
        errorMessage: "User not exist",
      });
    });
    it("throw error when login failed", async () => {
      jest
        .spyOn(SupportUserServices, "getUserAllInfoService")
        .mockResolvedValue({
          db: {
            username: "test-user",
          },
          cognito: {
            UserCreateDate: "2024-12-06T13:16:06.189Z",
            UserLastModifiedDate: "2024-12-09T07:51:31.003Z",
            UserStatus: "CONFIRMED",
            Username: "1",
            UserAttributes: [
              { Name: "sub", Value: "1" },
              { Name: "birthdate", Value: "03/05/1997" },
              { Name: "custom:vehicle_iu", Value: "null" },
              {
                Name: "preferred_username",
                Value: "test-user@gmail.com",
              },
              { Name: "custom:visual_id", Value: "null" },
              { Name: "custom:vehicle_plate", Value: "null" },
              { Name: "updated_at", Value: "1733490966" },
              { Name: "email", Value: "test-user@gmail.com" },
              { Name: "custom:terms_conditions", Value: "null" },
              { Name: "custom:source", Value: "ORGANIC" },
              { Name: "email_verified", Value: "true" },
              { Name: "given_name", Value: "test" },
              {
                Name: "custom:membership",
                Value:
                  '[{"name":"group1","visualID":"","expiry":""},{"name":"group2","visualID":"","expiry":"08/12/2025"},{"name":"group+","visualID":"","expiry":"23/12/2025"}]',
              },
              { Name: "custom:mandai_id", Value: "123" },
              { Name: "name", Value: "Test User" },
              { Name: "custom:last_login", Value: "null" },
              { Name: "family_name", Value: "Test" },
            ],
          },
        });
      const result = [];
      result["cognitoLoginError"] = "Login Cognito Error";
      jest
        .spyOn(usersService, "genSecretHash")
        .mockReturnValue("example-hash-secret");
      jest.spyOn(cognitoService, "cognitoUserLogin").mockResolvedValue(result);
      const rs = await userLoginServices.execute({
        body: {
          email: "test-email@gmail.com",
          password: "123",
        },
      });
      expect(rs).toEqual({
        errorMessage: "Login Cognito Error",
      });
    });
    it("throw error when updateToken failed", async () => {
      jest
        .spyOn(SupportUserServices, "getUserAllInfoService")
        .mockResolvedValue({
          db: {
            username: "test-user",
            credentials: {
              id: 1,
            },
          },
          cognito: {
            UserCreateDate: "2024-12-06T13:16:06.189Z",
            UserLastModifiedDate: "2024-12-09T07:51:31.003Z",
            UserStatus: "CONFIRMED",
            Username: "1",
            UserAttributes: [
              { Name: "sub", Value: "1" },
              { Name: "birthdate", Value: "03/05/1997" },
              { Name: "custom:vehicle_iu", Value: "null" },
              {
                Name: "preferred_username",
                Value: "test-user@gmail.com",
              },
              { Name: "custom:visual_id", Value: "null" },
              { Name: "custom:vehicle_plate", Value: "null" },
              { Name: "updated_at", Value: "1733490966" },
              { Name: "email", Value: "test-user@gmail.com" },
              { Name: "custom:terms_conditions", Value: "null" },
              { Name: "custom:source", Value: "ORGANIC" },
              { Name: "email_verified", Value: "true" },
              { Name: "given_name", Value: "test" },
              {
                Name: "custom:membership",
                Value:
                  '[{"name":"group1","visualID":"","expiry":""},{"name":"group2","visualID":"","expiry":"08/12/2025"},{"name":"group+","visualID":"","expiry":"23/12/2025"}]',
              },
              { Name: "custom:mandai_id", Value: "123" },
              { Name: "name", Value: "Test User" },
              { Name: "custom:last_login", Value: "null" },
              { Name: "family_name", Value: "Test" },
            ],
          },
        });
      const result = [];
      result["cognitoLoginResult"] = {
        accessToken: "accessToken-example",
        refreshToken: "refreshToken-example",
        idToken: "idToken-example",
      };
      jest.spyOn(usersService, "genSecretHash");
      jest.spyOn(cognitoService, "cognitoUserLogin").mockResolvedValue(result);
      jest
        .spyOn(userCredentialModel, "updateTokens")
        .mockRejectedValue("update db failed");
      const rs = await userLoginServices.execute({
        body: {
          email: "test-email@gmail.com",
          password: "123",
        },
      });
      expect(rs).toEqual({
        errorMessage: '"update db failed"',
      });
    });
    it("should return user when execute process success", async () => {
      jest
        .spyOn(SupportUserServices, "getUserAllInfoService")
        .mockResolvedValue({
          db: {
            username: "test-user",
            credentials: {
              id: 1,
            },
          },
          cognito: {
            UserCreateDate: "2024-12-06T13:16:06.189Z",
            UserLastModifiedDate: "2024-12-09T07:51:31.003Z",
            UserStatus: "CONFIRMED",
            Username: "1",
            UserAttributes: [
              { Name: "sub", Value: "1" },
              { Name: "birthdate", Value: "03/05/1997" },
              { Name: "custom:vehicle_iu", Value: "null" },
              {
                Name: "preferred_username",
                Value: "test-user@gmail.com",
              },
              { Name: "custom:visual_id", Value: "null" },
              { Name: "custom:vehicle_plate", Value: "null" },
              { Name: "updated_at", Value: "1733490966" },
              { Name: "email", Value: "test-user@gmail.com" },
              { Name: "custom:terms_conditions", Value: "null" },
              { Name: "custom:source", Value: "ORGANIC" },
              { Name: "email_verified", Value: "true" },
              { Name: "given_name", Value: "test" },
              {
                Name: "custom:membership",
                Value:
                  '[{"name":"group1","visualID":"","expiry":""},{"name":"group2","visualID":"","expiry":"08/12/2025"},{"name":"group+","visualID":"","expiry":"23/12/2025"}]',
              },
              { Name: "custom:mandai_id", Value: "123" },
              { Name: "name", Value: "Test User" },
              { Name: "custom:last_login", Value: "null" },
              { Name: "family_name", Value: "Test" },
            ],
          },
        });
      const result = [];
      result["cognitoLoginResult"] = {
        accessToken: "accessToken-example",
        refreshToken: "refreshToken-example",
        idToken: "idToken-example",
      };
      jest.spyOn(usersService, "genSecretHash");
      jest.spyOn(cognitoService, "cognitoUserLogin").mockResolvedValue(result);
      jest.spyOn(userCredentialModel, "updateTokens").mockResolvedValue({
        fieldCount: 0,
        affectedRows: 1,
        insertId: 0,
        info: "Rows matched: 1  Changed: 1  Warnings: 0",
        serverStatus: 2,
        warningStatus: 0,
        changedRows: 1,
      });
      const rs = await userLoginServices.execute({
        body: {
          email: "test-email@gmail.com",
          password: "123",
        },
      });
      expect(rs).toEqual({
        accessToken: "accessToken-example",
        cognito: {
          birthdate: "03/05/1997",
          createdAt: "2024-12-06T13:16:06.189Z",
          email: "test-user@gmail.com",
          email_verified: "true",
          family_name: "Test",
          given_name: "test",
          id: "1",
          last_login: "null",
          mandai_id: "123",
          membership: [
            {
              expiry: "",
              name: "group1",
              visualID: "",
            },
            {
              expiry: "08/12/2025",
              name: "group2",
              visualID: "",
            },
            {
              expiry: "23/12/2025",
              name: "group+",
              visualID: "",
            },
          ],
          name: "Test User",
          preferred_username: "test-user@gmail.com",
          source: "ORGANIC",
          status: "CONFIRMED",
          sub: "1",
          terms_conditions: "null",
          updatedAt: "2024-12-09T07:51:31.003Z",
          updated_at: "1733490966",
          vehicle_iu: "null",
          vehicle_plate: "null",
          visual_id: "null",
        },
        db: {
          credentials: {
            id: 1,
          },
          username: "test-user",
        },
        refreshToken: "refreshToken-example",
      });
    });
  });
});
