const crypto = require("crypto");
const PasswordService = require("../../userPasswordService");
const loggerService = require("../../../../logs/logger");
const { secrets } = require("../../../../services/secretsService");

async function generateMagicLinkToken(email, otp, expiredAt) {
  const ciamSecrets = await secrets.getSecrets("ciam-microservice-lambda-config");
  const ALGORITHM = process.env.AES_ALGORITHM || "aes-256-gcm";
  const KEY = Buffer.from(ciamSecrets.AES_SECRET_KEY, "hex"); // Must be 32 bytes

  const iv = crypto.randomBytes(12); // Initialization Vector
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const payload = JSON.stringify({ email, otp, expiredAt });

  try {
    let encrypted = cipher.update(payload, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    const result = Buffer.concat([iv, authTag, encrypted]);

    return result.toString("base64url"); // Safe for URLs or emails
  } catch (error) {
    loggerWrapper(
      "[CIAM] End sendEmail at PasswordlessSendCode Helper - Failed",
      {
        layer: "passwordlessSendCodeService.generateMagicLink",
        action: "sendCode.generateMagicLink",
        otp,
      }
    );
    throw error;
  }
}

async function generateOTP(useAlphanumeric, length) {
  try {
    const characters = useAlphanumeric
      ? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
      : "0123456789";

    const charCount = characters.length;
    const maxValidByte = Math.floor(256 / charCount) * charCount;

    const result = [];

    while (result.length < length) {
      const byte = crypto.randomBytes(1);
      const value = byte[0];

      if (value < maxValidByte) {
        result.push(characters[value % charCount]);
      }
    }

    const otp = result.join("");
    const otpHash = await PasswordService.hashPassword(otp);

    return { otp, otpHash };
  } catch (error) {
    loggerWrapper(
      "[CIAM] End sendEmail at PasswordlessSendCode Helper - Failed",
      {
        layer: "passwordlessSendCodeService.generateOTP",
        action: "sendCode.generateOTP",
      }
    );
    throw error;
  }
}

function loggerWrapper(action, loggerObj, type = "logInfo") {
  if (type === "error") {
    return loggerService.error(
      { passwordlessSendCodeService: { ...loggerObj } },
      {},
      action
    );
  }

  return loggerService.log(
    { passwordlessSendCodeService: { ...loggerObj } },
    action
  );
}
function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

module.exports = {
  generateMagicLinkToken,
  generateOTP,
  safeJsonParse
};
