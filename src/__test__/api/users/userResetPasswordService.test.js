const cognitoService = require("../../../services/cognitoService");
const UserResetPasswordService = require("../../../api/users/userResetPasswordService");
const userCredentialModel = require("../../../db/models/userCredentialModel");
const CommonErrors = require("../../../config/https/errors/commonErrors");
const CommonUtils = require("../../../utils/common");
const {
  getCurrentUTCTimestamp,
  currentDateAddHours,
} = require("../../../utils/dateUtils");
const { EXPIRE_TIME_HOURS } = require("../../../utils/constants");

jest.mock("../../../services/cognitoService", () => ({
  cognitoAdminGetUserByEmail: jest.fn(),
}));
jest.mock("../../../db/models/userCredentialModel", () => ({
  findByUserEmail: jest.fn(),
  updateByUserEmail: jest.fn(),
}));
jest.mock("../../../utils/common", () => ({
  generateSaltHash: jest.fn(),
  generateRandomToken: jest.fn(),
  messageLang: jest.fn(),
}));

describe("UserResetPasswordService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("execute", () => {
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
      jest
        .spyOn(CommonUtils, "messageLang")
        .mockReturnValueOnce("No record found.");
      await expect(
        UserResetPasswordService.execute({
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
    it("should throw an error when can not update data in DB", async () => {
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
      jest.spyOn(userCredentialModel, "findByUserEmail").mockResolvedValue({
        tokens: {
          accessToken: "123",
        },
      });
      jest
        .spyOn(userCredentialModel, "updateByUserEmail")
        .mockRejectedValue(
          new Error(JSON.stringify(CommonErrors.InternalServerError()))
        );
      jest
        .spyOn(CommonUtils, "messageLang")
        .mockReturnValueOnce("Requested email is invalid or empty.");
      await expect(
        UserResetPasswordService.execute({
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
        .spyOn(CommonUtils, "generateRandomToken")
        .mockReturnValueOnce("Kx7VXFMR80COmYMS6ktIBA==");
      jest
        .spyOn(CommonUtils, "generateSaltHash")
        .mockReturnValueOnce("ieUjtl8=");
      jest
        .spyOn(CommonUtils, "generateSaltHash")
        .mockReturnValueOnce("ji6yUfKV3gsoATF8oVdngR6smAMm1uAs9bCBG4PbZHg=");
      jest
        .spyOn(cognitoService, "cognitoAdminGetUserByEmail")
        .mockResolvedValue({
          UserAttributes: [{ Name: "email", Value: "test@gmail.com" }],
        });
      jest.spyOn(userCredentialModel, "findByUserEmail").mockResolvedValue({
        tokens: {
          accessToken: "123",
        },
      });
      jest
        .spyOn(userCredentialModel, "updateByUserEmail")
        .mockResolvedValue({});
      const rs = await UserResetPasswordService.execute({
        email: "test@gmail.com",
      });
      expect(rs).toEqual({
        email: "test@gmail.com",
      });
      expect(userCredentialModel.updateByUserEmail).toBeCalledWith(
        "test@gmail.com",
        {
          password_hash: "ji6yUfKV3gsoATF8oVdngR6smAMm1uAs9bCBG4PbZHg=",
          salt: "ieUjtl8=",
          tokens: {
            accessToken: "123",
            reset_token: {
              date_submitted: getCurrentUTCTimestamp(),
              expires_at: currentDateAddHours(EXPIRE_TIME_HOURS),
              reset_at: null,
            },
          },
        }
      );
    });
  });
});
