const UserSignupValidation = require("../../../../api/users/validations/UserSignupValidation");

describe("UserSignupValidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe("execute", () => {
    describe("validateRequestMembershipPasses", () => {
      it("should throw an error when firstName is missing", () => {
        const failedMessage = UserSignupValidation.validateRequestMembershipPasses({
          group: "fow+",
          email: "test@email.com",
        });
        expect(failedMessage).toEqual({
          membership: {
            code: 400,
            message: "Wrong parameters",
            error: {
              firstName: "The first name is invalid.",
            },
            mwgCode: "MWG_CIAM_PARAMS_ERR",
          },
          status: "failed",
          statusCode: 400,
        });
      });
      it("should throw an error when lastName is missing", () => {
        const failedMessage = UserSignupValidation.validateRequestMembershipPasses({
          group: "fow+",
          email: "test@email.com",
          firstName: "test",
        });
        expect(failedMessage).toEqual({
          membership: {
            code: 400,
            message: "Wrong parameters",
            error: {
              lastName: "The last name is invalid.",
            },
            mwgCode: "MWG_CIAM_PARAMS_ERR",
          },
          status: "failed",
          statusCode: 400,
        });
      });
      it("should throw an error when lastName is missing - multiple language", () => {
        const failedMessage = UserSignupValidation.validateRequestMembershipPasses({
          group: "fow+",
          email: "test@email.com",
          firstName: "test",
          language: 'ja'
        });
        expect(failedMessage).toEqual({
          membership: {
            code: 400,
            message: "Wrong parameters",
            error: {
              lastName: "苗字が無効です。",
            },
            mwgCode: "MWG_CIAM_PARAMS_ERR",
          },
          status: "failed",
          statusCode: 400,
        });
      });
      it("should throw an error when password is missing", () => {
        const failedMessage = UserSignupValidation.validateRequestMembershipPasses({
          group: "fow+",
          email: "test@email.com",
          firstName: "test",
          lastName: "test",
          country: "SG",
          phoneNumber: "123",
        });
        expect(failedMessage).toEqual({
          membership: {
            code: 400,
            message: "Wrong parameters",
            error: {
              password: "Password does not meet complexity requirements.",
            },
            mwgCode: "MWG_CIAM_PARAMS_ERR",
          },
          status: "failed",
          statusCode: 400,
        });
      });
      it("should throw an error when confirmPassword is missing", () => {
        const failedMessage = UserSignupValidation.validateRequestMembershipPasses({
          group: "fow+",
          email: "test@email.com",
          firstName: "test",
          lastName: "test",
          country: "SG",
          phoneNumber: "123",
          password: "123",
        });
        expect(failedMessage).toEqual({
          membership: {
            code: 400,
            message: "Wrong parameters",
            error: {
              confirmPassword: "Passwords do not match.",
            },
            mwgCode: "MWG_CIAM_PARAMS_ERR",
          },
          status: "failed",
          statusCode: 400,
        });
      });
      it("should throw an error when country more than 2 character", () => {
        const failedMessage = UserSignupValidation.validateRequestMembershipPasses({
          group: "fow+",
          email: "test@email.com",
          firstName: "test",
          lastName: "test",
          country: "3",
          phoneNumber: "312",
          password: "1",
          confirmPassword: "1",
        });
        expect(failedMessage).toEqual({
          membership: {
            code: 400,
            message: "Wrong parameters",
            error: {
              country: "Country is invalid.",
            },
            mwgCode: "MWG_CIAM_PARAMS_ERR",
          },
          status: "failed",
          statusCode: 400,
        });
      });
      it("should throw an error when dob not valid", () => {
        const failedMessage = UserSignupValidation.validateRequestMembershipPasses({
          group: "fow+",
          email: "test@email.com",
          firstName: "test",
          lastName: "test",
          country: "SG",
          phoneNumber: "312",
          password: "1",
          confirmPassword: "1",
          dob: "1/1",
        });
        expect(failedMessage).toEqual({
          membership: {
            code: 400,
            message: "Wrong parameters",
            error: {
              dob: "The date of birth is invalid. Must between 13 and 99 years old.",
            },
            mwgCode: "MWG_CIAM_PARAMS_ERR",
          },
          status: "failed",
          statusCode: 400,
        });
      });
      it("should throw an error when password not strong", () => {
        const failedMessage = UserSignupValidation.validateRequestMembershipPasses({
          group: "fow+",
          email: "test@email.com",
          firstName: "test",
          lastName: "test",
          country: "SG",
          phoneNumber: "312",
          password: "1",
          confirmPassword: "1",
          dob: "1/1/1996",
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
        const failedMessage = UserSignupValidation.validateRequestMembershipPasses({
          group: "fow+",
          email: "test@email.com",
          firstName: "test",
          lastName: "test",
          country: "SG",
          phoneNumber: "312",
          password: "Password123##",
          confirmPassword: "Password123###",
          dob: "1/1/1996",
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
        const failedMessage = UserSignupValidation.validateRequestMembershipPasses({
          group: "fow+",
          email: "test@email.com",
          firstName: "test",
          lastName: "test",
          country: "SG",
          phoneNumber: "312",
          password: "Password123##",
          confirmPassword: "Password123###",
          dob: "1/1/1996",
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
});
