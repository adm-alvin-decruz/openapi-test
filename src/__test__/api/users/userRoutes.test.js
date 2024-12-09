const request = require("supertest");
const express = require("express");
const router = require("../../../api/users/userRoutes");
const validationService = require("../../../services/validationService");
const userController = require("../../../api/users/usersContollers");
const emailDomainService = require("../../../services/emailDomainsService");
// Mocks
jest.mock("../../../services/validationService");
jest.mock("../../../api/users/usersContollers");

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
        .post("/users/sessions")
        .send({ email: "example-email@gmail.com", password: "123456" });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized" });
    });
    it("should return 200 and user information if everything ok", async () => {
      const mockResponse = {
        db: {
          user: "example-email@gmail.com",
        },
        cognito: {
          user: "example-email@gmail.com",
        },
        accessToken: "access-token",
        refreshToken: "refresh-token",
      };
      jest.spyOn(validationService, "validateAppID").mockReturnValue(true);
      jest.spyOn(userController, "userLogin").mockResolvedValue(mockResponse);
      const response = await request(app)
        .post("/users/sessions")
        .send({ email: "example-email@gmail.com", password: "123456" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
    });
    it("should return 500 if meet abnormal case", async () => {
      jest.spyOn(validationService, "validateAppID").mockReturnValue(true);
      jest
        .spyOn(userController, "userLogin")
        .mockRejectedValue(JSON.stringify("NotAuthorizedException"));
      const response = await request(app)
        .post("/users/sessions")
        .send({ email: "example-email@gmail.com", password: "123456" });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: "NotAuthorizedException" });
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
        message: "Logout Successfully",
      });
      const response = await request(app)
        .delete("/users/sessions")
        .set("Authorization", "Bearer 123basd");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Logout Successfully",
      });
    });
    it("should return 500 if meet abnormal case", async () => {
      jest.spyOn(validationService, "validateAppID").mockReturnValue(true);
      jest
        .spyOn(userController, "userLogout")
        .mockRejectedValue(JSON.stringify("NotAuthorizedException"));
      const response = await request(app)
        .delete("/users/sessions")
        .set("Authorization", "Bearer 123basd");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: "NotAuthorizedException" });
    });
  });
});
