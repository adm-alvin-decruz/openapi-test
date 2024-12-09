const userController = require("../../../api/users/usersContollers");
const loggerService = require("../../../logs/logger");

const userLoginJob = require("../../../api/users/userLoginJob");
const userLogoutJob = require("../../../api/users/userLogoutJob");

jest.mock("../../../api/users/userLoginJob");
jest.mock("../../../api/users/userLogoutJob");
jest.mock("../../../logs/logger");

describe("User Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("userLogin", () => {
    it("should log an error and throw if login job failed", async () => {
      jest
        .spyOn(userLoginJob, "perform")
        .mockRejectedValue("Cognito Login Failed");
      await expect(
        userController.userLogin({
          body: {
            email: "example-email@gmail.com",
            password: "123",
          },
        })
      ).rejects.toEqual("Cognito Login Failed");
      expect(loggerService.error).toHaveBeenCalledWith(
        `Error User login API. Error: Cognito Login Failed`
      );
    });
    it("should return user information when login success", async () => {
      const mockUser = {
        db: {
          user: {
            id: 1,
            email: "example-email@gmail.com",
            given_name: "Quang",
            family_name: "Dang",
            source: 1,
            active: 1,
            created_at: "2024-12-06T13:16:06.000Z",
            updated_at: "2024-12-06T13:16:06.000Z",
          },
          memberships: [
            {
              id: 1,
              user_id: 1,
              name: "wildpass",
              visual_id: "",
              expires_at: null,
              created_at: "2024-12-06T13:16:06.000Z",
              updated_at: "2024-12-06T13:16:06.000Z",
            },
          ],
          newsletters: [
            {
              id: 1,
              user_id: 1,
              name: "wildpass",
              type: 1,
              subscribed: 1,
              created_at: "2024-12-06T13:16:06.000Z",
              updated_at: "2024-12-06T13:16:06.000Z",
            },
          ],
          details: {
            id: 1,
            user_id: 1,
            phone_number: null,
            zoneinfo: null,
            address: null,
            picture: null,
            vehicle_iu: null,
            vehicle_plate: null,
            extra: null,
            created_at: "2024-12-06T13:16:06.000Z",
            updated_at: "2024-12-06T13:16:06.000Z",
          },
          credentials: {
            id: 1,
            user_id: 1,
            username: "example-email@gmail.com",
            tokens: null,
            last_login: "2024-12-06T13:16:06.000Z",
            created_at: "2024-12-06T13:16:06.000Z",
            updated_at: "2024-12-06T13:16:06.000Z",
          },
        },
        coginto: {
          sub: "5b557191-3c52-4dbf-8308-7c83b94e395a",
          birthdate: "03/05/1997",
          newsletter: '{"type":"1","name":"wildpass","subscribe":true}',
          vehicle_iu: "null",
          preferred_username: "vdr-synodus.quangnhd@wrs.com.sg",
          visual_id: "null",
          vehicle_plate: "null",
          updated_at: "1733490966",
          email: "vdr-synodus.quangnhd@wrs.com.sg",
          terms_conditions: "null",
          source: "ORGANIC",
          email_verified: "true",
          given_name: "Quang",
          membership: [
            {
              name: "wildpass",
              visualID: "",
              expiry: "",
            },
            {
              name: "fow",
              visualID: "",
              expiry: "08/12/2025",
            },
            {
              name: "fow+",
              visualID: "",
              expiry: "23/12/2025",
            },
          ],
          name: "Quang Dang",
          last_login: "null",
          family_name: "Dang",
          createdAt: "2024-12-06T13:16:06.189Z",
          updatedAt: "2024-12-09T07:51:31.003Z",
        },
        accessToken: "example-accessToken",
        refreshToken: "example-refreshToken",
      };
      jest.spyOn(userLoginJob, "perform").mockResolvedValue(mockUser);
      const rs = await userController.userLogin({
        body: {
          email: "example-email@gmail.com",
          password: "123",
        },
      });
      expect(rs).toEqual(mockUser);
    });
  });
  describe("userLogout", () => {
    it("should log an error and throw if logout job failed", async () => {
      jest
        .spyOn(userLogoutJob, "perform")
        .mockRejectedValue("Cognito Logout Failed");
      await expect(userController.userLogout("123")).rejects.toEqual(
        "Cognito Logout Failed"
      );
      expect(loggerService.error).toHaveBeenCalledWith(
        `Error User logout API. Error: Cognito Logout Failed`
      );
    });
    it("should return message successfully when logout success", async () => {
      jest
        .spyOn(userLogoutJob, "perform")
        .mockResolvedValue({ message: "Logout successfully" });
      const rs = await userController.userLogout("123");
      expect(rs).toEqual({ message: "Logout successfully" });
    });
  });
});
