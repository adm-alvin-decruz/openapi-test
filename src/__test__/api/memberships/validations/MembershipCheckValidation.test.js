const MembershipCheckValidation = require("../../../../api/memberships/validations/MembershipCheckValidation");

describe("MembershipCheckValidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe("execute", () => {
    it("should throw an error when email is required", () => {
      const failedMessage = MembershipCheckValidation.execute({});
      expect(failedMessage).toEqual({
        membership: {
          code: 200,
          message: "Requested email is invalid or empty.",
          email: undefined,
          mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_EMAIL_ERR",
        },
        status: "success",
        statusCode: 200,
      });
    });
    it("should throw an error when email is empty", () => {
      const failedMessage = MembershipCheckValidation.execute({
        email: "",
      });
      expect(failedMessage).toEqual({
        membership: {
          code: 200,
          message: "Requested email is invalid or empty.",
          email: "",
          mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_EMAIL_ERR",
        },
        status: "success",
        statusCode: 200,
      });
    });
    it("should throw an error when group is not support", () => {
      const failedMessage = MembershipCheckValidation.execute({
        email: "test@gmail.com",
        group: "",
      });
      expect(failedMessage).toEqual({
        membership: {
          code: 400,
          message: "Wrong parameters",
          error: {
            group: "The group is invalid.",
          },
          mwgCode: "MWG_CIAM_PARAMS_ERR",
        },
        status: "failed",
        statusCode: 400,
      });
    });
  });
});
