const crypto = require("crypto");
const lambdaService = require("../../../../services/lambdaService");
const loggerService = require("../../../../logs/logger");
const tokenModel = require("../../../../db/models/passwordlessTokenModel");
const failedJobsModel = require("../../../../db/models/failedJobsModel");
const { maskKeyRandomly } = require("../../../../utils/common");
const passwordlessSendCodeHelper = require("./passwordlessSendCodeHelpers");
const PasswordlessErrors = require("../../../../config/https/errors/passwordlessErrors");
const configsModel = require("../../../../db/models/configsModel");
const cognitoService = require("../../../../services/cognitoService");
const { response } = require("express");
const { switchIsTurnOn } = require("../../../../helpers/dbSwitchesHelpers");

class PasswordlessSendCodeService {

  async getValueByConfigValueName(config, key, valueName) {
    try {
      const cfg = await configsModel.findByConfigKey(config, key);

      let value;
      value = cfg.value;
      if (!(valueName in value)) {
        throw new Error(`Value name '${valueName}' not found in config ${config}/${key}`);
      }

      return value[valueName];
    } catch (err) {
      this.loggerWrapper("[CIAM] getValueByConfigValueName - Failed", {
        layer: "passwordlessSendCodeService",
        action: "getValueByConfigValueName",
        error: err.message,
      }, "error");
      throw err;
    }
  }
  async saveTokenDB(tokenData) {
    const hash = tokenData.hash;
    const salt = tokenData.salt;
    const expiredAt = tokenData.expiredAt;

    try {
      const tokenDB = await tokenModel.create(tokenData);

      this.loggerWrapper("[CIAM] End saveTokenDB at PasswordlessSendCode Service - Success", {
        layer: "passwordlessSendCodeService.generateCode",
        action: "sendCode.saveTokenDB",
        hash: maskKeyRandomly(hash),
        salt,
        expiredAt,
      });

      return tokenDB;
    } catch (error) {
      this.loggerWrapper(
        "[CIAM] End saveUserDB at PasswordlessSendCode Service - Failed",
        {
          layer: "passwordlessSendCodeService.generateCode",
          action: "sendCode.saveTokenDB",
          error: new Error(error),
          hash: maskKeyRandomly(hash),
          salt,
          expiredAt,
        },
        "error"
      );
      await failedJobsModel.create({
        uuid: crypto.randomUUID(),
        name: "failedSavingTokenInformation",
        action: "failed",
        data: {
          hash: maskKeyRandomly(hash),
          salt,
          expiredAt,
        },
        source: 2,
        triggered_at: null,
        status: 0,
      });
      throw error;
    }
  }

  async shouldGenerateNewToken(email, otpInterval) {
    try {
      const token = await tokenModel.findLatestTokenByEmail(email);

      if (!token) {
        return true;
      }
      const now = new Date();
      const tokenRequestedAt = new Date(token.requested_at);
      const elapsedMs = now - tokenRequestedAt;             
      const intervalMs = Number(otpInterval) * 1000;

      if (elapsedMs >= intervalMs) {
        await tokenModel.markTokenById(token.id);
        return true;
      }

      // Too soon to resend — return remaining wait time
      return false;
    } catch (error) {
      this.loggerWrapper(
        "[CIAM] End shouldGenerateNewToken at PasswordlessSendCode Service - Failed",
        {
          layer: "passwordlessSendCodeService.generateCode",
          action: "sendCode.shouldGenerateNewToken",
          error: new Error(error),
          email: email,
          otpInterval: otpInterval,
          waitMs,
        },
        "error"
      );
      throw error;
    }
  }

  // param: purpose: "signup" or "login"
  async generateCode(req, purpose) {
    const email = req.body.email;
    const lang = req.body.lang;

    const sendEnabled = await switchIsTurnOn("passwordless_enable_send_otp");
    const signupSendEnabled = await switchIsTurnOn("passwordless_enable_send_sign_up_email");
    if ((purpose === "signup" && !signupSendEnabled) || (purpose !== "signup" && !sendEnabled)) {
      throw new Error(JSON.stringify(PasswordlessErrors.sendCodeError(email, lang)));
    }

    // read from configs
    // check if should generate new token
    //otp in seconds

    const OTP_INTERVAL = await this.getValueByConfigValueName("passwordless-otp", "otp-config", "otp_interval");
    const allowed = await this.shouldGenerateNewToken(email, OTP_INTERVAL);
    if (!allowed) {
      throw new Error(JSON.stringify(PasswordlessErrors.sendCodetooSoonFailure(email, lang)));
    }

    try {
      //move to config and switches

      const OTP_LENGTH = await this.getValueByConfigValueName("passwordless-otp", "otp-config", "otp_length");

      const OTP_USE_ALPHANUMERIC_SWITCH = await switchIsTurnOn("passwordless_enable_otp_use_alphanumeric");

      let EXPIRY_SECONDS;
      if (purpose === "signup") {
        EXPIRY_SECONDS = await this.getValueByConfigValueName("passwordless-otp", "otp-config", "otp_signup_expiry");
      } else {
        EXPIRY_SECONDS = await this.getValueByConfigValueName("passwordless-otp", "otp-config", "otp_login_expiry");
      }

      const expiryMs = Number(EXPIRY_SECONDS) * 1000;
      const expiredAt = new Date(Date.now() + expiryMs).toISOString();
      
      const otpData = await passwordlessSendCodeHelper.generateOTP(OTP_USE_ALPHANUMERIC_SWITCH, OTP_LENGTH);

      const magicToken = await passwordlessSendCodeHelper.generateMagicLinkToken(email, otpData.otp, expiredAt);

      const salt = crypto.randomBytes(32).toString("base64");

      // Save token to the DB
      await this.saveTokenDB({
        email: email,
        hash: otpData.otpHash,
        salt: salt,
        expiredAt: expiredAt,
        isUsed: 0,
      });

      // Save token to Cognito - need to enhance
      // not needed to replace password to cognito

      // const newPassword = otpData.otp + salt;
      // await cognitoService.cognitoAdminSetUserPassword(email, newPassword);

      return {
        otp: otpData.otp,
        magicToken: magicToken,
        expiredAt: expiredAt,
      };
    } catch (error) {
      this.loggerWrapper("[CIAM] End sendEmail at PasswordlessSendCode Service - Failed", {
        layer: "passwordlessSendCodeService.generateCode",
        action: "sendCode.generateCode",
        email: email,
      });
      throw new Error(JSON.stringify(PasswordlessErrors.sendCodeError(email, lang)));
    }
  }

  async sendEmail(req, codeData, purpose) {
    const email = req.body.email;
    const lang = req.body.lang;
    const otp = codeData.otp;
    const magicToken = codeData.magicToken;

    const magicLink = "http://localhost:3010/public/v2/ciam/auth/passwordless/session?token=" + magicToken;

    // purpose: "signup" | "login"
    req["apiTimer"] = req.processTimer.apiRequestTimer();
    req.apiTimer.log("passwordlessSendCodeServices.sendEmail start"); // log process time

    const functionName = process.env.LAMBDA_EMAIL_TRIGGER_SERVICE_FUNCTION;
    const emailTriggerCustomData = {
      emailFrom: `Mandai Wildlife Reserve <no-reply@mandai.com>`,
      emailTo: email,
      emailTemplateId: "d-ce7103f8f3de4bddbba29d38631d1061",
      customData: {
        otp,
        magicLink,
      },
    };

    try {
      // lambda invoke
      let response = await lambdaService.lambdaInvokeFunction(emailTriggerCustomData, functionName);

      if (response.statusCode === 200) {
        this.loggerWrapper("[CIAM] End sendEmail at PasswordlessSendCode Service - Success", {
          layer: "passwordlessSendCodeService.sendEmail",
          action: "sendCode.sendEmail",
          email: email,
        });

        req.apiTimer.end("passwordlessSendCodeServices.sendEmail end");
        return response;
      }

      if ([400, 500].includes(response.statusCode) || response.errorType === "Error") {
        throw new Error();
      }
    } catch (error) {
      this.loggerWrapper(
        "[CIAM] End sendEmail at PasswordlessSendCode Service - Failed",
        {
          layer: "passwordlessSendCodeService.validateOTP",
          action: "sendEmail",
          lambdaResponse: response.statusCode,
        },
        "error"
      );
      req.apiTimer.end("passwordlessSendCodeServices.sendEmail failed");
      throw new Error(JSON.stringify(PasswordlessErrors.sendCodeError(email, lang)));
    }
  }

  loggerWrapper(action, loggerObj, type = "logInfo") {
    if (type === "error") {
      return loggerService.error({ passwordlessSendCodeService: { ...loggerObj } }, {}, action);
    }

    return loggerService.log({ passwordlessSendCodeService: { ...loggerObj } }, action);
  }
}

module.exports = new PasswordlessSendCodeService();
