const userResetPasswordJob = require("../../../api/users/userResetPasswordJob");
const UserResetPasswordService = require("../../../api/users/userResetPasswordService");

jest.mock("../../../api/users/userResetPasswordService", () => ({
  execute: jest.fn(),
}));

describe("UserResetPasswordJob", () => {
  describe("success", () => {
    it("should return the result passed to success method", () => {
      const rs = userResetPasswordJob.success("test@gmail.com");
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
    });
  });

  describe("perform", () => {
    it("should call failed when there is an errorMessage in the response", async () => {
      jest.spyOn(UserResetPasswordService, "execute").mockRejectedValue(
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
      await expect(userResetPasswordJob.perform("123")).rejects.toThrow(
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

    it("should call success when the response is valid", async () => {
      jest
        .spyOn(UserResetPasswordService, "execute")
        .mockResolvedValue({ email: "test@gmail.com" });

      const response = await userResetPasswordJob.perform("123");

      expect(response).toEqual({
        membership: {
          code: 200,
          mwgCode: "MWG_CIAM_USERS_EMAIL_RESET_PASSWORD_SUCCESS",
          message: "Password reset link sent to your email",
          email: "test@gmail.com",
        },
        status: "success",
        statusCode: 200,
      });
    });
  });
});
