const cognitoService = require("../../../services/cognitoService");
const userServices = require("../../../api/users/usersServices");
const userModel = require("../../../db/models/userModel");
const pool = require("../../../db/connections/mysqlConn");

jest.mock("../../../services/cognitoService", () => ({
  cognitoAdminGetUserByAccessToken: jest.fn(),
  cognitoUserChangePassword: jest.fn(),
  cognitoAdminUpdateNewUser: jest.fn(),
  cognitoAdminGetUserByEmail: jest.fn(),
  cognitoForgotPassword: jest.fn(),
  cognitoConfirmForgotPassword: jest.fn(),
}));
jest.mock("../../../db/models/userModel", () => ({
  findByEmail: jest.fn(),
}));

describe("UserService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe("adminUpdateNewUser", () => {
    it("should throw an error when user not found in Cognito", async () => {
      jest
        .spyOn(cognitoService, "cognitoAdminGetUserByAccessToken")
        .mockRejectedValue(
          new Error(
            JSON.stringify({
              status: "failed",
              data: {
                name: "UserNotFoundException",
              },
            })
          )
        );
      await expect(
        userServices.adminUpdateNewUser({
          email: "test@gmail.com",
          firstName: "test",
          lastName: "test",
          dob: "11/04/1996",
          group: "fow+",
          phoneNumber: "+12065551212",
          newsletter: { type: "1", name: "fow+", subscribe: true },
          password: "123",
          confirmPassword: "123",
          oldPassword: "123",
        })
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: "MWG_CIAM_USER_UPDATE_ERR",
              message: "This email address does not have a Mandai Account.",
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
      jest.spyOn(userModel, "findByEmail").mockResolvedValue(undefined);
      await expect(
        userServices.adminUpdateNewUser({
          email: "test@gmail.com",
          firstName: "test",
          lastName: "test",
          dob: "11/04/1996",
          group: "fow+",
          phoneNumber: "+12065551212",
          newsletter: { type: "1", name: "fow+", subscribe: true },
          password: "123",
          confirmPassword: "123",
          oldPassword: "123",
        })
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: "MWG_CIAM_USER_UPDATE_ERR",
              message: "This email address does not have a Mandai Account.",
            },
            status: "success",
            statusCode: 200,
          })
        )
      );
    });
    it("should throw an error when user update password not correct", async () => {
      jest
        .spyOn(cognitoService, "cognitoAdminGetUserByAccessToken")
        .mockResolvedValue({
          UserAttributes: [{ Name: "email", Value: "test@gmail.com" }],
        });
      jest.spyOn(userModel, "findByEmail").mockResolvedValue({
        id: "1",
      });
      jest.spyOn(pool, "transaction").mockResolvedValue("commit");
      jest.spyOn(cognitoService, "cognitoUserChangePassword").mockRejectedValue(
        new Error(
          JSON.stringify({
            status: "failed",
            data: {
              name: "UserNotFoundException",
            },
          })
        )
      );
      await expect(
        userServices.adminUpdateNewUser({
          email: "test@gmail.com",
          firstName: "test",
          lastName: "test",
          dob: "11/04/1996",
          group: "fow+",
          phoneNumber: "+12065551212",
          newsletter: { type: "1", name: "fow+", subscribe: true },
          password: "123",
          confirmPassword: "123",
          oldPassword: "123",
        })
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: "MWG_CIAM_USER_UPDATE_ERR",
              message: "This email address does not have a Mandai Account.",
            },
            status: "success",
            statusCode: 200,
          })
        )
      );
    });
    it("should return success when everything pass", async () => {
      jest
        .spyOn(cognitoService, "cognitoAdminGetUserByAccessToken")
        .mockResolvedValue({
          UserAttributes: [
            { Name: "email", Value: "test@gmail.com" },
            { Name: "name", Value: "testD testF" },
            { Name: "given_name", Value: "testD" },
            { Name: "family_name", Value: "testF" },
          ],
        });
      jest.spyOn(userModel, "findByEmail").mockResolvedValue({
        id: "1",
      });
      jest.spyOn(pool, "transaction").mockResolvedValue("commit");
      jest
        .spyOn(cognitoService, "cognitoUserChangePassword")
        .mockResolvedValue({
          status: "passed",
        });
      jest
        .spyOn(cognitoService, "cognitoAdminUpdateNewUser")
        .mockResolvedValue({
          status: "passed",
        });
      const rs = await userServices.adminUpdateNewUser(
        {
          email: "test@gmail.com",
          firstName: "testB",
          lastName: "testA",
          dob: "11/04/1996",
          group: "fow+",
          phoneNumber: "+12065551212",
          newsletter: { type: "1", name: "fow+", subscribe: true },
          password: "123",
          confirmPassword: "123",
          oldPassword: "123",
        },
        "example-token"
      );
      expect(rs).toEqual({
        membership: {
          code: 200,
          mwgCode: "MWG_CIAM_USER_UPDATE_SUCCESS",
          message: "User info updated successfully.",
        },
        status: "success",
        statusCode: 200,
      });
      expect(cognitoService.cognitoAdminUpdateNewUser).toBeCalledWith(
        [
          { Name: "preferred_username", Value: "test@gmail.com" },
          { Name: "given_name", Value: "testB" },
          { Name: "family_name", Value: "testA" },
          { Name: "birthdate", Value: "11/04/1996" },
          {
            Name: "custom:membership",
            Value: '[{"name":"fow+","visualID":"","expiry":""}]',
          },
          { Name: "phone_number", Value: "+12065551212" },
          {
            Name: "custom:newsletter",
            Value: '{"type":"1","name":"fow+","subscribe":true}',
          },
          { Name: "name", Value: "testB testA" },
        ],
        "test@gmail.com"
      );
    });
  });
  describe("requestResetPassword", () => {
    it("should throw an error when user not found in Cognito", async () => {
      jest
        .spyOn(cognitoService, "cognitoAdminGetUserByEmail")
        .mockRejectedValue(
          new Error(
            JSON.stringify({
              status: "failed",
              data: {
                name: "UserNotFoundException",
              },
            })
          )
        );
      await expect(
        userServices.requestResetPassword({
          email: "test@gmail.com",
        })
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_NULL",
              message: "No record found.",
              email: "test@gmail.com",
            },
            status: "success",
            statusCode: 200,
          })
        )
      );
    });
    it("should throw an error when reset password from cognito not proceed", async () => {
      jest
        .spyOn(cognitoService, "cognitoAdminGetUserByEmail")
        .mockResolvedValue({
          UserAttributes: [
            {
              Name: "email",
              Value: "test@gmail.com",
            },
          ],
        });
      jest.spyOn(cognitoService, "cognitoForgotPassword").mockRejectedValue({
        status: "failed",
      });
      await expect(
        userServices.requestResetPassword({
          email: "test@gmail.com",
        })
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_EMAIL_ERR",
              message: "Requested email is invalid or empty.",
              email: "test@gmail.com",
            },
            status: "success",
            statusCode: 200,
          })
        )
      );
    });
    it("should return success when process reset password pass", async () => {
      jest
        .spyOn(cognitoService, "cognitoAdminGetUserByEmail")
        .mockResolvedValue({
          UserAttributes: [{ Name: "email", Value: "test@gmail.com" }],
        });
      jest.spyOn(cognitoService, "cognitoForgotPassword").mockResolvedValue({
        status: "passed",
      });
      jest
        .spyOn(userServices, "genSecretHash")
        .mockImplementationOnce(() => "123abcde");
      const rs = await userServices.requestResetPassword({
        email: "test@gmail.com",
      });
      expect(rs).toEqual({
        membership: {
          code: 200,
          mwgCode: "MWG_CIAM_USERS_EMAIL_RESET_PASSWORD_SUCCESS",
          message: "Password reset link sent to your email",
          email: "test@gmail.com",
        },
        status: "success",
        statusCode: 200,
      });
      expect(cognitoService.cognitoForgotPassword).toBeCalledTimes(1);
    });
  });
  describe("userConfirmResetPassword", () => {
    it("should throw an error when user not found in Cognito", async () => {
      jest
        .spyOn(cognitoService, "cognitoAdminGetUserByEmail")
        .mockRejectedValue(
          new Error(
            JSON.stringify({
              status: "failed",
              data: {
                name: "UserNotFoundException",
              },
            })
          )
        );
      await expect(
        userServices.userConfirmResetPassword({
          email: "test@gmail.com",
        })
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_NULL",
              message: "No record found.",
              email: "test@gmail.com",
            },
            status: "success",
            statusCode: 200,
          })
        )
      );
    });
    it("should throw an error when reset password from cognito not proceed", async () => {
      jest
        .spyOn(cognitoService, "cognitoAdminGetUserByEmail")
        .mockResolvedValue({
          UserAttributes: [
            {
              Name: "email",
              Value: "test@gmail.com",
            },
          ],
        });
      jest
        .spyOn(cognitoService, "cognitoConfirmForgotPassword")
        .mockRejectedValue({
          status: "failed",
        });
      await expect(
        userServices.userConfirmResetPassword({
          email: "test@gmail.com",
          newPassword: "1",
          confirmPassword: "1",
          passwordToken: "2",
        })
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_EMAIL_ERR",
              message: "Requested email is invalid or empty.",
              email: "test@gmail.com",
            },
            status: "success",
            statusCode: 200,
          })
        )
      );
    });
    it("should throw an error when reset password has token is expired", async () => {
      jest
        .spyOn(cognitoService, "cognitoAdminGetUserByEmail")
        .mockResolvedValue({
          UserAttributes: [
            {
              Name: "email",
              Value: "test@gmail.com",
            },
          ],
        });
      jest
        .spyOn(cognitoService, "cognitoConfirmForgotPassword")
        .mockRejectedValue(new Error(JSON.stringify({
          status: "failed",
          data: {
            name: "ExpiredCodeException",
          },
        })));
      await expect(
        userServices.userConfirmResetPassword({
          email: "test@gmail.com",
          newPassword: "1",
          confirmPassword: "1",
          passwordToken: "2",
        })
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              mwgCode: "MWG_CIAM_PASSWORD_ERR_04",
              message: "Token has already been used.",
            },
            status: "success",
            statusCode: 200,
          })
        )
      );
    });
    it("should return success when process confirm reset password pass", async () => {
      jest
        .spyOn(cognitoService, "cognitoAdminGetUserByEmail")
        .mockResolvedValue({
          UserAttributes: [{ Name: "email", Value: "test@gmail.com" }],
        });
      jest
        .spyOn(cognitoService, "cognitoConfirmForgotPassword")
        .mockResolvedValue({
          status: "passed",
        });
      jest
        .spyOn(userServices, "genSecretHash")
        .mockImplementationOnce(() => "123abcde");
      const rs = await userServices.requestResetPassword({
        email: "test@gmail.com",
        newPassword: "1",
        confirmPassword: "1",
        passwordToken: "2",
      });
      expect(rs).toEqual({
        membership: {
          code: 200,
          mwgCode: "MWG_CIAM_USERS_EMAIL_RESET_PASSWORD_SUCCESS",
          message: "Password reset link sent to your email",
          email: "test@gmail.com",
        },
        status: "success",
        statusCode: 200,
      });
      expect(cognitoService.cognitoForgotPassword).toBeCalledTimes(1);
    });
  });
});
