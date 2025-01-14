const userConfirmResetPasswordJob = require("../../../api/users/userConfirmResetPasswordJob");
const userConfirmResetPasswordService = require("../../../api/users/userConfirmResetPasswordService");

jest.mock("../../../api/users/userConfirmResetPasswordService", () => ({
  execute: jest.fn(),
}));

describe("UserConfirmResetPasswordJob", () => {
  describe("success", () => {
    it("should return the result passed to success method", () => {
      const rs = userConfirmResetPasswordJob.success({
        membership: {
          code: 200,
          mwgCode: "MWG_CIAM_USERS_EMAIL_RESET_PASSWORD_SUCCESS",
          message: "Password successfully reset.",
          passwordToken: "1234567",
          resetCompletedAt: "2025-01-06 12:30:30",
        },
        status: "success",
        statusCode: 200,
      });
      expect(rs).toEqual({
        membership: {
          code: 200,
          mwgCode: "MWG_CIAM_USERS_EMAIL_RESET_PASSWORD_SUCCESS",
          message: "Password successfully reset.",
          passwordToken: "1234567",
          resetCompletedAt: "2025-01-06 12:30:30",
        },
        status: "success",
        statusCode: 200,
      });
    });
  });

  describe("perform", () => {
    it("should call failed when there is an errorMessage in the response", async () => {
      jest.spyOn(userConfirmResetPasswordService, "execute").mockRejectedValue(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              message: "Requested token is invalid or empty.",
              mwgCode: "MWG_CIAM_VALIDATE_TOKEN_ERR",
            },
            status: "success",
            statusCode: 200,
          })
        )
      );
      await expect(
        userConfirmResetPasswordJob.perform({
          newPassword: "Password123###",
          confirmPassword: "Password123###",
          passwordToken: "12345678",
        })
      ).rejects.toThrow(
        new Error(
          JSON.stringify({
            membership: {
              code: 200,
              message: "Requested token is invalid or empty.",
              mwgCode: "MWG_CIAM_VALIDATE_TOKEN_ERR",
            },
            status: "success",
            statusCode: 200,
          })
        )
      );
    });

    it("should call success when the response is valid", async () => {
      jest.spyOn(userConfirmResetPasswordService, "execute").mockResolvedValue({
        membership: {
          code: 200,
          mwgCode: "MWG_CIAM_USERS_EMAIL_RESET_PASSWORD_SUCCESS",
          message: "Password successfully reset.",
          passwordToken: "1234567",
          resetCompletedAt: "2025-01-06 12:30:30",
        },
        status: "success",
        statusCode: 200,
      });

      const response = await userConfirmResetPasswordJob.perform({
        newPassword: "Password123###",
        confirmPassword: "Password123###",
        passwordToken: "12345678",
      });

      expect(response).toEqual({
        membership: {
          code: 200,
          mwgCode: "MWG_CIAM_USERS_EMAIL_RESET_PASSWORD_SUCCESS",
          message: "Password successfully reset.",
          passwordToken: "1234567",
          resetCompletedAt: "2025-01-06 12:30:30",
        },
        status: "success",
        statusCode: 200,
      });
    });
  });
});
