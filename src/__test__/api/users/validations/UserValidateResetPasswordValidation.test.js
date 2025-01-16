const UserValidateResetPasswordValidation = require("../../../../api/users/validations/UserValidateResetPasswordValidation");

describe("UserValidateResetPasswordValidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe("execute", () => {
    it("should throw an error when token is empty", () => {
      const failedMessage = UserValidateResetPasswordValidation.execute("");
      expect(failedMessage).toEqual({
        membership: {
          code: 400,
          mwgCode: "MWG_CIAM_PARAMS_ERR",
          message: "Wrong parameters",
          error: {
            passwordToken: "Token is required.",
          },
        },
        status: "failed",
        statusCode: 400,
      });
    });
    it("should throw an error when token is not enough length", () => {
      const failedMessage =
        UserValidateResetPasswordValidation.execute("123456");
      expect(failedMessage).toEqual({
        membership: {
          code: 401,
          message: "Requested token is invalid or empty.",
          mwgCode: "MWG_CIAM_VALIDATE_TOKEN_ERR",
        },
        status: "failed",
        statusCode: 401,
      });
    });
    it("should throw an error when token is not enough length - multiple language", () => {
      const failedMessage = UserValidateResetPasswordValidation.execute(
        "123456",
        "kr"
      );
      expect(failedMessage).toEqual({
        membership: {
          code: 401,
          message: "요청된 토큰이 유효하지 않거나 비어 있습니다.",
          mwgCode: "MWG_CIAM_VALIDATE_TOKEN_ERR",
        },
        status: "failed",
        statusCode: 401,
      });
    });
  });
});
