const passwordService = require('../userPasswordService');
const passwordVersionModel = require('../../../db/models/passwordVersionModel');

async function isPasswordVersionExisted(passwordInput, listPasswordsByVersion, versionCounting) {
  if (!listPasswordsByVersion || !listPasswordsByVersion.length) {
    return false;
  }
  if (versionCounting < 1) {
    return false;
  }

  //2. check listPasswordsByVersion input is existed in list password or not - if existed return false
  for (const pass of listPasswordsByVersion) {
    const isPasswordExisted = await passwordService.comparePassword(
      passwordInput,
      pass.password_hash,
    );

    if (isPasswordExisted) {
      return true;
    }
  }
  return false;
}

async function newPasswordVersion(
  userId,
  passwordHashed,
  versionCounting,
  passwordsByConfigVersion,
  passwordsMaster,
) {
  //  3.a create new record with version === config version number
  await passwordVersionModel.create(userId, passwordHashed, versionCounting);

  //  3.b modify list password master to mark version
  //     3.b.i if idx existed in list password -> version = config version - (idx + 1)
  //     3.b.ii if idx non existed in list password -> version = -1
  const modifyVersionPasswordMaster = [];
  const passwordsHash = passwordsByConfigVersion.map((pass) => pass.password_hash);
  for (let idx = 0; idx < passwordsMaster.length; idx++) {
    if (passwordsHash.includes(passwordsMaster[idx].password_hash)) {
      modifyVersionPasswordMaster.push({
        ...passwordsMaster[idx],
        version: versionCounting - 1 - idx,
      });
    } else {
      modifyVersionPasswordMaster.push({
        ...passwordsMaster[idx],
        version: -1,
      });
    }
  }
  for (const pass of modifyVersionPasswordMaster) {
    await passwordVersionModel.updateVersion(userId, pass.id, pass.version);
  }

  //4. delete password has negative
  await passwordVersionModel.deleteVersionNegativeByUserID(userId);
}
module.exports = {
  isPasswordVersionExisted,
  newPasswordVersion,
};
