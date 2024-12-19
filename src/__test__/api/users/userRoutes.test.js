const request = require("supertest");
const express = require("express");
const router = require("../../../api/users/userRoutes");
const validationService = require("../../../services/validationService");
const userController = require("../../../api/users/usersContollers");
const emailDomainService = require("../../../services/emailDomainsService");
// Mocks
jest.mock("../../../services/validationService", () => ({
  validateAppID: jest.fn(),
}));
jest.mock("../../../api/users/usersContollers", () => ({
  userLogin: jest.fn(),
  userLogout: jest.fn(),
  adminCreateNewUser: jest.fn()
}));

describe("User Routes", () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(router);
    global.processTimer = {
      apiRequestTimer: jest.fn().mockReturnValue({
        end: jest.fn(),
      }),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("POST:/users/sessions - Login API", () => {
    it("should return 400 if request body is empty", async () => {
      const response = await request(app).post("/users/sessions").send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        membership: {
          code: 400,
          message: "Request body is empty",
          mwgCode: "MWG_CIAM_PARAMS_ERR",
        },
        status: "failed",
        statusCode: 400,
      });
    });
    describe("should return 400 if email is invalid", () => {
      it("email field empty", async () => {
        const response = await request(app).post("/users/sessions").send({
          email: "",
        });
        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          membership: {
            code: 400,
            message: "The email is invalid",
            mwgCode: "MWG_CIAM_PARAMS_ERR",
          },
          status: "failed",
          statusCode: 400,
        });
      });
      it("email invalid format", async () => {
        const response = await request(app).post("/users/sessions").send({
          email: "example-email",
        });
        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          membership: {
            code: 400,
            message: "The email is invalid",
            mwgCode: "MWG_CIAM_PARAMS_ERR",
          },
          status: "failed",
          statusCode: 400,
        });
      });
      it("email valid but domain in blacklist", async () => {
        jest
          .spyOn(emailDomainService, "getCheckDomainSwitch")
          .mockResolvedValue(true);
        jest
          .spyOn(emailDomainService, "validateEmailDomain")
          .mockReturnValue(false);
        const response = await request(app).post("/users/sessions").send({
          email: "example-email@gmal.com",
        });
        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          membership: {
            code: 400,
            message: "The email is invalid",
            mwgCode: "MWG_CIAM_PARAMS_ERR",
          },
          status: "failed",
          statusCode: 400,
        });
      });
    });
    it("should return 401 if app ID is invalid", async () => {
      jest.spyOn(validationService, "validateAppID").mockReturnValue(false);
      const response = await request(app)
        .post("/users/sessions", {
          headers: {
            "mwg-app-id": "",
          },
        })
        .send({ email: "example-email@gmail.com", password: "123456" });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized" });
    });
    it("should return 200 and user information if everything ok", async () => {
      const mockResponse = {
        membership: {
          code: 200,
          mwgCode: "MWG_CIAM_USERS_LOGIN_SUCCESS",
          message: "Login success.",
          accessToken: "test-access",
          mandaiId: "example-id",
          email: "test@gmail.com",
        },
        status: "success",
        statusCode: 200,
      };
      jest.spyOn(validationService, "validateAppID").mockReturnValue(true);
      jest.spyOn(userController, "userLogin").mockResolvedValue(mockResponse);
      const response = await request(app)
        .post("/users/sessions")
        .send({ email: "test@gmail.com", password: "123456" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
    });
    it("should throw error when login failed", async () => {
      jest.spyOn(validationService, "validateAppID").mockReturnValue(true);
      jest.spyOn(userController, "userLogin").mockRejectedValue(
        new Error(
          JSON.stringify({
            membership: {
              code: 501,
              mwgCode: "MWG_CIAM_NOT_IMPLEMENTED",
              message: "Not implemented",
            },
            status: "failed",
            statusCode: 501,
          })
        )
      );
      const response = await request(app)
        .post("/users/sessions")
        .send({ email: "example-email@gmail.com", password: "123456" });
      expect(response.status).toBe(501);
      expect(response.body).toEqual({
        membership: {
          code: 501,
          mwgCode: "MWG_CIAM_NOT_IMPLEMENTED",
          message: "Not implemented",
        },
        status: "failed",
        statusCode: 501,
      });
    });
  });
  describe("DELETE:/users/sessions - Logout API", () => {
    it("should return 401 if accessToken authorization not pass", async () => {
      const response = await request(app).delete("/users/sessions", {
        headers: {
          authorization: "",
        },
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: "Unauthorized",
      });
    });
    it("should return 401 if app ID is invalid", async () => {
      jest.spyOn(validationService, "validateAppID").mockReturnValue(false);
      const response = await request(app).delete("/users/sessions", {
        headers: {
          authorization: "Bearer abcde",
        },
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized" });
    });
    it("should return 200 and logout successfully", async () => {
      jest.spyOn(validationService, "validateAppID").mockReturnValue(true);
      jest.spyOn(userController, "userLogout").mockResolvedValue({
        membership: {
          code: 200,
          mwgCode: "MWG_CIAM_USERS_LOGOUT_SUCCESS",
          message: "Logout success.",
          email: "test@gmail.com",
        },
        status: "success",
        statusCode: 200,
      });
      const response = await request(app)
        .delete("/users/sessions")
        .set("Authorization", "Bearer" + Math.random());

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        membership: {
          code: 200,
          mwgCode: "MWG_CIAM_USERS_LOGOUT_SUCCESS",
          message: "Logout success.",
          email: "test@gmail.com",
        },
        status: "success",
        statusCode: 200,
      });
    });
  });
  describe("POST:/users - Signup API", () => {
    it("should return 401 if app ID is invalid", async () => {
      jest.spyOn(validationService, "validateAppID").mockReturnValue(false);
      const response = await request(app).post("/users",{
        headers: {
          "mwg-app-id": "",
        },
      }).send({
        email: "test@gmail.com"
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: "Unauthorized" });
    });
    it("should return 200 and signup successfully", async () => {
      jest.spyOn(validationService, "validateAppID").mockReturnValue(true);
      jest.spyOn(userController, "adminCreateNewUser").mockResolvedValue({
        membership: {
          code: 200,
          mandaiId: "123",
          message: "New user signed up successfully.",
          mwgCode: "MWG_CIAM_USER_SIGNUP_SUCCESS",
        },
        status: "success",
        statusCode: 200,
      });
      const response = await request(app).post("/users").send({ email: "test@gmail.com", group: "fow+" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        membership: {
          code: 200,
          mandaiId: "123",
          message: "New user signed up successfully.",
          mwgCode: "MWG_CIAM_USER_SIGNUP_SUCCESS",
        },
        status: "success",
        statusCode: 200,
      });
    });
  });
});
