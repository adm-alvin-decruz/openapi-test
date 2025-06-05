require("dotenv").config();
const { generateSaltHash } = require("../../utils/common");
const userCredentialModel = require("../../db/models/userCredentialModel");
const { getCurrentUTCTimestamp } = require("../../utils/dateUtils");
const ValidateTokenErrors = require("../../config/https/errors/validateTokenErrors");

class UserValidateResetPasswordService {
  async execute(token, lang) {
    const saltKey = generateSaltHash(token);
    const passwordHashed = generateSaltHash(token, saltKey);
    const userInfo = await userCredentialModel.findByPasswordHash(
      passwordHashed
    );
    //can not inquiry user info inquiry by saltKey and password hashed
    if (!userInfo) {
      throw new Error(
        JSON.stringify(ValidateTokenErrors.ciamValidateTokenErr(lang))
      );
    }
    if (userInfo && !userInfo.tokens) {
      throw new Error(
        JSON.stringify(ValidateTokenErrors.ciamValidateTokenErr(lang))
      );
    }
    //can not token expires not existed - login scenario
    if (
      userInfo.tokens &&
      (!userInfo.tokens.reset_token || !userInfo.tokens.reset_token.expires_at)
    ) {
      throw new Error(
        JSON.stringify(ValidateTokenErrors.ciamValidateTokenErr(lang))
      );
    }
    if (
      userInfo.tokens &&
      userInfo.tokens.reset_token &&
      userInfo.tokens.reset_token.reset_at
    ) {
      throw new Error(
        JSON.stringify(ValidateTokenErrors.ciamValidateTokenBeingUsedErr(lang))
      );
    }
    //token is expire
    if (getCurrentUTCTimestamp() > userInfo.tokens.reset_token.expires_at) {
      throw new Error(
        JSON.stringify(ValidateTokenErrors.ciamValidateTokenExpireErr(lang))
      );
    }
    return {
      token,
      email: userInfo.username,
      userId: userInfo.user_id,
      tokens: userInfo.tokens,
      userId: userInfo.user_id
    };
  }
}

module.exports = new UserValidateResetPasswordService();
