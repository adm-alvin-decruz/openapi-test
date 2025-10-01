const lambdaService = require("../../services/lambdaService");
require("dotenv").config();
const appConfig = require("../../config/appConfig");
const ApiUtils = require("../../utils/apiUtils");
const logger = require("../../logs/logger");
const { getCiamSecrets, secrets } = require("../../services/secretsService");

async function lambdaSendEmail(req) {
  req["apiTimer"] = req.processTimer.apiRequestTimer();
  req.apiTimer.log("lambdaSendEmail starts"); // log process time
  // send wildpass email or resend wildpass
  let functionName = process.env.LAMBDA_CIAM_SIGNUP_TRIGGER_MAIL_FUNCTION;

  let emailTriggerData = {
    email: req.body.email,
    firstName: req.body.firstName,
    group: req.body.group,
    ID: req.body.mandaiID,
  };

  // process emailType
  if (req.body.emailType) {
    emailTriggerData["emailType"] = req.body.emailType;
  }

  // if switch 'signup_email_passkit' is true, send email
  if (req.body.resendWpWithPasskit) {
    // map emailType
    let emailType = await mapEmailType(req.body.emailType);
    functionName = process.env.LAMBDA_CIAM_SIGNUP_TRIGGER_PASSKIT_MAIL_FUNCTION;
    emailTriggerData = {
      email: req.body.email,
      passType: req.body.group,
      emailType: emailType,
      caller: "ciam",
    };
  }

  // lambda invoke
  let emailLambda = await lambdaService.lambdaInvokeFunction(emailTriggerData, functionName);

  req.apiTimer.end("lambdaSendEmail"); // log end time
  return emailLambda;
}

async function mapEmailType(emailType) {
  switch (emailType) {
    case "resend_wp":
      emailType = "resend";
      break;
    case "update_wp":
      emailType = "resend";
      break;
    case "resend_mp":
      emailType = "resend";
      break;
    default:
      emailType = "signup";
      break;
  }
  return emailType;
}

/**
 * Send email using email trigger service
 *
 * @param {json} req
 * @returns
 */
async function emailServiceAPI(req, isPasswordless = false, codeData = null) {
  req["apiTimer"] = req.processTimer.apiRequestTimer();
  req.apiTimer.log("usersEmailService.emailTriggerApi start"); // log process time

  let appEnv = process.env.APP_ENV;
  let emailServiceAPIUrl = "EMAIL_SERVICE_API_URL_" + appEnv.toUpperCase();
  const apiEndpoint = appConfig[emailServiceAPIUrl] + appConfig["EMAIL_SERVICE_API_EMAIL_PATH"];

  try {
    const headers = await createEmailServiceHeader();
    const body = !isPasswordless
      ? await createApiRequestBody(req)
      : await createApiRequestBodyPasswordless(req, codeData);

    const response = await ApiUtils.makeRequest(apiEndpoint, "post", headers, body);

    req.apiTimer.end("usersEmailService.emailTriggerApi"); // log end time
    return ApiUtils.handleResponse(response);
  } catch (error) {
    req.apiTimer.end("usersEmailService.emailTriggerApi"); // log end time
    throw new Error(`usersEmailService error: ${error}`);
  }
}

async function createApiRequestBody(req) {
  let appEnv = process.env.APP_ENV;
  let ciamResetPasswordEmailLink = "RESET_PASSWORD_EMAIL_LINK_" + appEnv.toUpperCase();
  // body data
  const body = {
    emailFrom: appConfig.RESET_PASSWORD_EMAIL_FROM,
    emailTo: req.body.email,
    emailTemplateId: appConfig.RESET_PASSWORD_EMAIL_TEMPLATE_ID,
    customData: {
      firstName: req.body.firstName,
      membershipPasswordRecoveryLink: `${appConfig[ciamResetPasswordEmailLink]}?passwordToken=${req.body.resetToken}`,
      membershipPasswordRecoveryLinkExpiryDate: {
        timeStamp: req.body.expiredAt,
        dateFormat: "dddd, D MMM YYYY",
      },
      AEMWebUrl: "https://www.mandai.com",
      group: req.body.group,
      ID: req.body.ID,
      caller: "ciam",
    },
  };

  logger.log(body, "userEmailService.createApiRequestBody");
  return body;
}

async function createApiRequestBodyPasswordless(req, codeData) {
  // let appEnv = process.env.APP_ENV;

  const emailTo = req.body?.email;
  const otp = codeData.otp;
  const magicToken = codeData.magicToken;

  const emailFrom = appConfig.PASSWORDLESS_EMAIL_FROM || "Mandai Wildlife Reserve <no-reply@mandai.com>";
  const emailTemplateId = appConfig.PASSWORDLESS_EMAIL_TEMPLATE_ID || "d-ce7103f8f3de4bddbba29d38631d1061";

  const appEnv = process.env.APP_ENV;
  const baseKey = `PASSWORDLESS_MAGIC_LINK_BASE_URL_${appEnv.toUpperCase()}`;
  const magicBase = appConfig[baseKey] || appConfig.PASSWORDLESS_MAGIC_LINK_BASE_URL || "http://localhost:5173";

  const magicLink = `${magicBase}?token=${encodeURIComponent(magicToken)}`;

  return {
    emailFrom,
    emailTo,
    emailTemplateId,
    customData: {
      otp,
      membershipPageDomain: magicLink,
    },
  };
}

async function createEmailServiceHeader() {
  try {
    let appEnv = process.env.APP_ENV;
    let emailServiceConfig = "EMAIL_SERVICE_APP_ID_" + appEnv.toUpperCase();
    const ciamSecrets = await secrets.getSecrets("ciam-microservice-lambda-config");
    const headers = {
      "mwg-app-id": appConfig[emailServiceConfig],
      "x-api-key": ciamSecrets.EMAIL_SERVICE_API_KEY,
      "Content-Type": "application/json",
    };
    return headers;
  } catch (error) {
    throw new Error(`createEmailServiceHeader error: ${error}`);
  }
}

module.exports = {
  lambdaSendEmail,
  emailServiceAPI,
};
