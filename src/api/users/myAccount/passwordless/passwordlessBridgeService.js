const crypto = require("crypto");
const cognitoService = require("../../../../services/cognitoService");
const userCredentialModel = require("../../../../db/models/userCredentialModel");
const loggerService = require("../../../../logs/logger");
const { encrypt, decrypt } = require("../../../../utils/cryptoEnvelope");

async function getBridgePasswordIfAny(email) {
  const cred = await userCredentialModel.findByUserEmail(email);
  if (!cred.passwordless_bridge_pw_enc) {
    return null;
  }
  try {
    return decrypt(cred.passwordless_bridge_pw_enc);
  } catch {
    return null;
  }
}

async function getOrCreateBridgePassword(email) {
  const cred = await userCredentialModel.findByUserEmail(email);
  if (!cred) {
    throw new Error(JSON.stringify({
      statusCode: 400,
      status: "failed",
      message: "User not found",
      mwgCode: "MWG_CIAM_USERS_NOT_FOUND"
    }));
  }

  if (cred.passwordless_bridge_pw_enc) {
    try {
      const plain = decrypt(cred.passwordless_bridge_pw_enc);
      return plain;
    } catch (e) {
      loggerService.error(
        { bridgePwService: { email, action: "decrypt", error: String(e) } },
        {},
        "[CIAM] Bridge PW decrypt failed"
      );
    }
  }

  const bridgePw = crypto.randomBytes(48).toString("base64url");

  //Set once in Cognito
  await cognitoService.cognitoAdminSetUserPassword(email, bridgePw);

  const enc = encrypt(bridgePw);
  await userCredentialModel.updateByUserEmail(email, {
    passwordless_bridge_pw_enc: enc,
    passwordless_bridge_pw_set_at: new Date()
  });

  loggerService.log(
    { bridgePwService: { email, action: "created_and_stored" } },
    "[CIAM] Bridge PW created"
  );

  return bridgePw;
}

module.exports = { getBridgePasswordIfAny, getOrCreateBridgePassword };
