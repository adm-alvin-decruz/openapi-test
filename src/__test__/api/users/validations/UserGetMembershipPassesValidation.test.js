const UserGetMembershipPassesValidation = require("../../../../api/users/validations/UserGetMembershipPassesValidation");

describe("UserGetMembershipPassesValidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe("execute", () => {
    it("should throw an error when visual exists but empty string", () => {
      const failedMessage = UserGetMembershipPassesValidation.execute({
        visualId: ""
      });
      expect(failedMessage).toEqual({
        membership: {
          code: 400,
          mwgCode: "MWG_CIAM_PARAMS_ERR",
          message: "Wrong parameters",
          error: {
            visualId: "Visual id is invalid",
          },
        },
        status: "failed",
        statusCode: 400,
      });
    });
    it("should throw an error when list visualId is not array", () => {
      const failedMessage =
        UserGetMembershipPassesValidation.execute({
          list: {}
        });
      expect(failedMessage).toEqual({
        membership: {
          code: 200,
          message: "Requested token is invalid or empty.",
          mwgCode: "MWG_CIAM_VALIDATE_TOKEN_ERR",
        },
        status: "success",
        statusCode: 200,
      });
    });
    it("should throw an error when list visualId & visualID is exists", () => {
      const failedMessage =
          UserGetMembershipPassesValidation.execute({
            list: {}
          });
      expect(failedMessage).toEqual({
        membership: {
          code: 200,
          message: "Requested token is invalid or empty.",
          mwgCode: "MWG_CIAM_VALIDATE_TOKEN_ERR",
        },
        status: "success",
        statusCode: 200,
      });
    });
    it("should throw an error when visual exists but empty string - multiple language", () => {
      const failedMessage = UserGetMembershipPassesValidation.execute({
        visualId: "",
        language: "kr"
      });
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
  });
});
