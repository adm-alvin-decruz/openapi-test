require('dotenv').config();
const passwordVersionModel = require('../../db/models/passwordVersionModel');
const passwordService = require('./userPasswordService');
const configsModel = require('../../db/models/configsModel');
const {
  isPasswordVersionExisted,
  newPasswordVersion,
} = require('./helpers/userPasswordVersionHelper');

class UserPasswordVersionService {
  async passwordValidProcessing(userId, password) {
    const passwordInfo = await passwordVersionModel.findByUserId(userId);
    const passHashed = await passwordService.hashPassword(password);
    const passwordVersionConfig = await configsModel.findByConfigKey(
      'password_versioning_conf',
      'version',
    );
    const versionCounting =
      passwordVersionConfig && passwordVersionConfig.value ? passwordVersionConfig.value : 8;
    //1. get list listPasswordsByVersion to check by config number
    const listPasswordsByConfigVersion = passwordInfo.slice(0, versionCounting);

    //2. check password input is existed in list password by config - if existed return false
    const passwordVersionExisted = await isPasswordVersionExisted(
      password,
      listPasswordsByConfigVersion,
      versionCounting,
    );

    //stop process if password is existed
    if (passwordVersionExisted) {
      return true;
    }

    //3. if password input non exists - update password version and add new one
    await newPasswordVersion(
      userId,
      passHashed,
      versionCounting,
      listPasswordsByConfigVersion,
      passwordInfo,
    );
    return passwordVersionExisted;
  }
}

module.exports = new UserPasswordVersionService();
