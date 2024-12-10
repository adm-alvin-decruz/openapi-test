const request = require("supertest");
const express = require("express");
const router = require("../../../api/memberships/membershipRoutes");
const membershipsController = require("../../../api/memberships/membershipsControllers");
const validationService = require("../../../services/validationService");

jest.mock("../../../services/validationService");
jest.mock("../../../api/memberships/membershipsControllers");

describe("Membership Routes", () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(router);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("POST: /users/memberships", () => {
    it("should return 401 if app ID is invalid", async () => {
      jest.spyOn(validationService, "validateAppID").mockReturnValue(false);
      const response = await request(app)
        .post("/users/memberships")
        .send({ email: "example-email@gmail.com", group: "wildpass" });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized" });
    });
    it("should return 200 user membership when success", async () => {
      const mockMembership = {
        membership: {
          group: {
            wildpass: true,
          },
          code: 200,
          mwgCode: "MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS",
          message: "Get memberships success.",
          email: "test-email@gmail.com",
        },
        status: "success",
        statusCode: 200,
      };
      jest.spyOn(validationService, "validateAppID").mockReturnValue(true);
      jest
        .spyOn(membershipsController, "adminGetUser")
        .mockResolvedValue(mockMembership);
      const response = await request(app)
        .post("/users/memberships")
        .send({
          body: {
            email: "test-email@gmail.com",
            group: "wildpass",
          },
        });
      expect(response.body).toEqual(mockMembership);
    });
    it("should return 500 user membership when failed", async () => {
      jest.spyOn(validationService, "validateAppID").mockReturnValue(true);
      jest
        .spyOn(membershipsController, "adminGetUser")
        .mockRejectedValue(new Error());
      const response = await request(app)
        .post("/users/memberships")
        .send({
          body: {
            email: "test-email@gmail.com",
            group: "wildpass",
          },
        });
      expect(response.body).toEqual({ message: "Internal server error" });
    });
  });
});
