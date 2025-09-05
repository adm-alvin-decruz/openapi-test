const request = require("supertest");
const express = require("express");

jest.spyOn(console, "log").mockImplementation(() => {});
jest.spyOn(console, "error").mockImplementation(() => {});

jest.mock("../../../services/validationService", () => ({
  __esModule: true,
  validateAppID: jest.fn(),
}));

jest.mock("../../../api/users/myAccount/passwordless/passwordlessControllers", () => ({
  __esModule: true,
  sendCode: jest.fn(),
  verifyCode: jest.fn(),
}));

jest.mock("../../../api/users/myAccount/passwordless/defineChallenge", () => {
  const actual = jest.requireActual("../../../api/users/myAccount/passwordless/defineChallenge");
  return {
    __esModule: true,
    ...actual, // preserves mapDefineCreateReasonToHelperKey & mapDefineReasonToHelperKey
    defineForCreate: jest.fn(),
    defineForVerify: jest.fn(),
  };
});

jest.mock("../../../middleware/rateLimitMiddleware", () => {
  const noop = (req, res, next) => next();
  return { __esModule: true, default: noop, RateLimitMiddleware: noop };
});
jest.mock("../../../middleware/turnstileMiddleware", () => {
  const noop = (req, res, next) => next();
  return { __esModule: true, default: { verifyTurnstile: noop }, verifyTurnstile: noop };
});
jest.mock("../../../middleware/validationMiddleware", () => {
  const noop = (req, res, next) => next();
  return {
    __esModule: true,
    isEmptyRequest: noop,
    validateEmail: noop,
    lowercaseTrimKeyValueString: noop,
  };
});

const router = require("../../../api/users/myAccount/passwordless/passwordlessRoutes");

const validationService = require("../../../services/validationService");
const controllers = require("../../../api/users/myAccount/passwordless/passwordlessControllers");
const { defineForCreate, defineForVerify } = require("../../../api/users/myAccount/passwordless/defineChallenge");

describe("Passwordless Routes", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    global.processTimer = {
      apiRequestTimer: jest.fn().mockReturnValue({ end: jest.fn(), log: jest.fn() }),
    };

    app.use("/v2/ciam/auth", router);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("POST /v2/ciam/auth/passwordless/send", () => {
    it("401 when app-id is invalid", async () => {
      validationService.validateAppID.mockReturnValue(false);

      const res = await request(app)
        .post("/v2/ciam/auth/passwordless/send")
        .send({ email: "test@example.com", lang: "en", captchaToken: "fake" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        membership: {
          code: 401,
          mwgCode: "MWG_CIAM_UNAUTHORIZED",
          message: "Unauthorized",
        },
        status: "failed",
        statusCode: 401,
      });
    });

    it("429 when Define denies (too_soon cooldown)", async () => {
      validationService.validateAppID.mockReturnValue(true);
      defineForCreate.mockResolvedValue({ proceed: false, reason: "too_soon" });

      const res = await request(app)
        .post("/v2/ciam/auth/passwordless/send")
        .send({ email: "test@example.com", lang: "en", captchaToken: "fake" });

      expect(res.status).toBe(429);
      expect(res.body).toEqual({
        auth: {
          code: 429,
          mwgCode: "MWG_CIAM_USERS_CODE_RATE_LIMIT",
          message: "Please wait before requesting another code.",
          email: "test@example.com",
        },
        status: "failed",
        statusCode: 429,
      });
    });

    it("200 when sendCode succeeds", async () => {
      validationService.validateAppID.mockReturnValue(true);
      defineForCreate.mockResolvedValue({ proceed: true, purpose: "login" });

      controllers.sendCode.mockResolvedValue({
        auth: {
          method: "passwordless",
          code: 200,
          mwgCode: "MWG_CIAM_USERS_OTP_SENT_SUCCESS",
          message: "OTP sent.",
        },
        status: "success",
        statusCode: 200,
      });

      const res = await request(app)
        .post("/v2/ciam/auth/passwordless/send")
        .send({ email: "test@example.com", lang: "en", captchaToken: "fake" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        auth: {
          method: "passwordless",
          code: 200,
          mwgCode: "MWG_CIAM_USERS_OTP_SENT_SUCCESS",
          message: "OTP sent.",
        },
        status: "success",
        statusCode: 200,
      });
    });
  });

  describe("POST /v2/ciam/auth/passwordless/session", () => {
    it("401 when Define denies (not_found)", async () => {
      validationService.validateAppID.mockReturnValue(true);
      defineForVerify.mockResolvedValue({ proceed: false, reason: "not_found" });

      const res = await request(app)
        .post("/v2/ciam/auth/passwordless/session")
        .send({ email: "test@example.com", code: "123456", language: "en" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        auth: {
          code: 401,
          mwgCode: "MWG_CIAM_USERS_OTP_ERR",
          message: "OTP is invalid. Please try again.",
          email: "test@example.com",
        },
        status: "failed",
        statusCode: 401,
      });
    });

    it("200 with login payload when verifyCode succeeds", async () => {
      validationService.validateAppID.mockReturnValue(true);
      defineForVerify.mockResolvedValue({ proceed: true });

      controllers.verifyCode.mockResolvedValue({
        auth: {
          code: 200,
          mwgCode: "MWG_CIAM_USERS_LOGIN_SUCCESS",
          message: "Login success.",
          accessToken: "access-abc",
          mandaiId: "mandai-1",
          email: "test@example.com",
          callbackURL: "https://uat-www.mandai.com/bin/wrs/ciam/auth/callback",
        },
        status: "success",
        statusCode: 200,
      });

      const res = await request(app)
        .post("/v2/ciam/auth/passwordless/session")
        .send({ email: "test@example.com", code: "123456" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        auth: {
          code: 200,
          mwgCode: "MWG_CIAM_USERS_LOGIN_SUCCESS",
          message: "Login success.",
          accessToken: "access-abc",
          mandaiId: "mandai-1",
          email: "test@example.com",
          callbackURL: "https://uat-www.mandai.com/bin/wrs/ciam/auth/callback",
        },
        status: "success",
        statusCode: 200,
      });
    });
  });
});
