const cognitoService = require("../../../services/cognitoService");
const passwordService = require("../userPasswordService");
const userCredentialModel = require("../../../db/models/userCredentialModel");
const loggerService = require("../../../logs/logger");
const switchService = require("../../../services/switchService");
const nopCommerceLoginService = require("../../components/nopCommerce/services/nopCommerceLoginService");

async function proceedVerifyPassword(userInfo, password) {
  const passwordVerificationSwitch = await switchService.findByName(
    "password_verification_nopCommerce"
  );
  if (passwordVerificationSwitch.switch === 1) {
    const loginResult = await nopCommerceLoginService.loginNopCommerce(
      userInfo.username,
      password
    );
    return !!(
      loginResult.MembershipLoginResult &&
      loginResult.MembershipLoginResult.Message === "3420|Login Success"
    );
  }

  const passwordHashed = passwordService.createPassword(
    password,
    userInfo.password_salt
  );
  return passwordHashed.toUpperCase() === userInfo.password_hash.toUpperCase();
}

async function proceedSetPassword(userInfo, password) {
  //if user first login is empty - do nothing
  if (!userInfo || !userInfo.password_hash || !userInfo.password_salt) {
    return;
  }

  //if match argon - user is normal flow - do nothing
  if (userInfo.password_hash.startsWith("$argon2")) {
    return;
  }

  const isMatchedPassword = await proceedVerifyPassword(userInfo, password);

  if (isMatchedPassword) {
    //https://mandaiwildlifereserve.atlassian.net/browse/CIAM-280
    // if (!passwordPattern(password)) {
    //   throw new Error(JSON.stringify(CommonErrors.PasswordRequireChange(lang)));
    // }

    try {
      await cognitoService.cognitoAdminSetUserPassword(
        userInfo.username,
        password
      );
      const hashPassword = await passwordService.hashPassword(password);
      await userCredentialModel.updateByUserEmail(userInfo.username, {
        password_hash: hashPassword,
        salt: null,
      });
    } catch (error) {
      loggerService.error(
        {
          user: {
            action: "proceedSetPassword",
            email: userInfo.username,
            layer: "userLoginServices.proceedSetPassword",
            error: new Error(error),
          },
        },
        {},
        "[CIAM] Proceed Set Password - Failed"
      );
    }
  }
}

module.exports = {
  proceedSetPassword,
};
