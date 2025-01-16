const UserUpdateValidation = require("../../../../api/users/validations/UserUpdateValidation");

describe("UserUpdateValidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe("execute", () => {
    describe("validateRequestFowFowPlus", () => {
      it("should throw an error when firstName is empty", () => {
        const failedMessage = UserUpdateValidation.validateRequestFowFowPlus({
          group: "fow+",
          email: "test@email.com",
          firstName: "",
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
      it("should throw an error when lastName is empty", () => {
        const failedMessage = UserUpdateValidation.validateRequestFowFowPlus({
          group: "fow+",
          email: "test@email.com",
          firstName: "test",
          lastName: "",
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
      it("should throw an error when lastName is empty - multiple language", () => {
        const failedMessage = UserUpdateValidation.validateRequestFowFowPlus({
          group: "fow+",
          email: "test@email.com",
          firstName: "test",
          lastName: "",
          language: "ja",
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
      it("should throw an error when country is empty", () => {
        const failedMessage = UserUpdateValidation.validateRequestFowFowPlus({
          group: "fow+",
          email: "test@email.com",
          firstName: "test",
          lastName: "test",
          country: ""
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
      it("should throw an error when phoneNumber is empty", () => {
        const failedMessage = UserUpdateValidation.validateRequestFowFowPlus({
          group: "fow+",
          email: "test@email.com",
          firstName: "test",
          lastName: "test",
          country: "SG",
          phoneNumber: ""
        });
        expect(failedMessage).toEqual({
          membership: {
            code: 400,
            message: "Wrong parameters",
            error: {
              phoneNumber: "Phone number is invalid.",
            },
            mwgCode: "MWG_CIAM_PARAMS_ERR",
          },
          status: "failed",
          statusCode: 400,
        });
      });
      it("should throw an error when country more than 2 character", () => {
        const failedMessage = UserUpdateValidation.validateRequestFowFowPlus({
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
        const failedMessage = UserUpdateValidation.validateRequestFowFowPlus({
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
      it("should throw an error when password is has value, but not fill confirmPassword", () => {
        const failedMessage = UserUpdateValidation.validateRequestFowFowPlus({
          group: "fow+",
          email: "test@email.com",
          firstName: "test",
          lastName: "test",
          country: "SG",
          phoneNumber: "312",
          password: "1",
          oldPassword: "1",
          confirmPassword: "",
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
      it("should throw an error when password is has value, but not fill oldPassword", () => {
        const failedMessage = UserUpdateValidation.validateRequestFowFowPlus({
          group: "fow+",
          email: "test@email.com",
          firstName: "test",
          lastName: "test",
          country: "SG",
          phoneNumber: "312",
          password: "1",
          oldPassword: "",
          confirmPassword: "1",
          dob: "1/1/1996",
        });
        expect(failedMessage).toEqual({
          membership: {
            code: 401,
            message: "Old password do not match.",
            mwgCode: "MWG_CIAM_PASSWORD_ERR_03",
          },
          status: "failed",
          statusCode: 401,
        });
      });
    });
    it("should throw an error when failed is called", () => {
      const failedMessage = UserUpdateValidation.execute({
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
    it("should call validate FOW/FOW+ when group is fow/fow+", () => {
      UserUpdateValidation.validateRequestFowFowPlus = jest.fn();
      UserUpdateValidation.execute({
        group: "fow+",
      });
      expect(UserUpdateValidation.validateRequestFowFowPlus).toHaveBeenCalled();
    });
    it("should call validate wildpass when group is wildpass", () => {
      UserUpdateValidation.validateRequestWildPass = jest.fn();
      UserUpdateValidation.execute({
        group: "wildpass",
      });
      expect(UserUpdateValidation.validateRequestWildPass).toHaveBeenCalled();
    });
  });
});
