require("dotenv").config();
const passwordVersionModel = require("../../db/models/passwordVersionModel");
const passwordService = require("./userPasswordService");
const configsModel = require("../../db/models/configsModel");

class UserPasswordVersionService {
  async passwordValidProcessing(userId, password) {
    const passwordInfo = await passwordVersionModel.findByUserId(userId);
    const passHashed = await passwordService.hashPassword(password);

    if (!passwordInfo || !passwordInfo.length) {
      //insert password when data is empty
      await passwordVersionModel.create(userId, passHashed, 1);
      return false;
    }
    const config = await configsModel.findByConfigKey("password_version", "version");
    const versionCounting = config && config.value ? config.value : 0;
    if (versionCounting < 1) {
      return false;
    }

    //1. get list password to check by config number
    const listPasswordsByConfigVersion = passwordInfo.slice(0, versionCounting);

    //2. check password input is existed in list password or not - if existed return false
    for (const pass of listPasswordsByConfigVersion) {
      const isPasswordExisted = await passwordService.comparePassword(password, pass.password_hash);

      if (isPasswordExisted) {
        return true;
      }
    }

    //3. if no exists
    //  3.a create new record with version === config version number
    await passwordVersionModel.create(userId, passHashed, versionCounting);

    //  3.b modify list password master to mark version
    //     3.b.i if idx existed in list password -> version = config version - (idx + 1)
    //     3.b.ii if idx non existed in list password -> version = -1
    const modifyVersionPasswordMaster = [];
    const passwordsHash = listPasswordsByConfigVersion.map(pass => pass.password_hash);
    for (let idx = 0; idx < passwordInfo.length; idx++) {
      if (passwordsHash.includes(passwordInfo[idx].password_hash)) {
        modifyVersionPasswordMaster.push({
          ...passwordInfo[idx],
          version: versionCounting - 1 - idx
        })
      } else {
        modifyVersionPasswordMaster.push({
          ...passwordInfo[idx],
          version: -1
        })
      }
    }
    for (const pass of modifyVersionPasswordMaster) {
      await passwordVersionModel.updateVersion(userId, pass.id, pass.version);
    }

    //4. delete password has negative
    await passwordVersionModel.deleteVersionNegativeByUserID(userId);

    return false;
  }
}

module.exports = new UserPasswordVersionService();
