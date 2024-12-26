const UserConfirmResetPasswordValidation = require("../../../../api/users/validations/UserConfirmResetPasswordValidation");

describe("UserConfirmResetPasswordValidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe("execute", () => {
    it("should throw an error when password not strong", () => {
      const failedMessage = UserConfirmResetPasswordValidation.execute({
        newPassword: "1",
      });
      expect(failedMessage).toEqual({
        membership: {
          code: 200,
          message: "Password does not meet complexity requirements.",
          mwgCode: "MWG_CIAM_PASSWORD_ERR_01",
        },
        status: "success",
        statusCode: 200,
      });
    });
    it("should throw an error when password & confirm not match", () => {
      const failedMessage = UserConfirmResetPasswordValidation.execute({
        newPassword: "Password123##",
        confirmPassword: "Password123###",
      });
      expect(failedMessage).toEqual({
        membership: {
          code: 200,
          message: "Passwords do not match.",

          mwgCode: "MWG_CIAM_PASSWORD_ERR_02",
        },
        status: "success",
        statusCode: 200,
      });
    });
    it("should throw an error when password & confirm not match - multiple language", () => {
      const failedMessage = UserConfirmResetPasswordValidation.execute({
        newPassword: "Password123##",
        confirmPassword: "Password123###",
        language: 'kr'
      });
      expect(failedMessage).toEqual({
        membership: {
          code: 200,
          message: "비밀번호가 일치하지 않습니다.",
          mwgCode: "MWG_CIAM_PASSWORD_ERR_02",
        },
        status: "success",
        statusCode: 200,
      });
    });
  });
});
