const supportDBService = require('./supportDBServices');
const supportCognitoService = require('./supportCognitoServices');
const DataPatcher = require('./dataPatcher');
const userConfig = require('../../config/usersConfig');

class SupportUserServices {
  static async getUserAllInfoService(req) {
    let result = {};
    result['db'] = await supportDBService.getUserFullInfoByEmail(req);
    result['cognito'] = await supportCognitoService.getUserCognitoInfo(req);

    console.log(result);
    return result;
  }

  static async getUsersPaginationCustomService(req) {
    let result = await supportDBService.getUserPageCustomField(req);

    console.log('SupportUserServices getUsersPaginationCustomService', result);
    return result;
  }

  static async batchPatchUserService(req) {
    const dataPatcher = new DataPatcher();

    const data = req.body;
    const maxPageSize = userConfig.DEFAULT_PAGE_SIZE;
    let limit = parseInt(data.limit) || maxPageSize;
    req.body['limit'] = limit < maxPageSize ? limit : maxPageSize; // control the per API call txn records

    try {
      const affectedEmails = await dataPatcher.patchData(req.body);
      console.log('Patching completed');
      console.log('Affected emails:', affectedEmails);
      return affectedEmails;
    } catch (error) {
      console.error('Error during patching:', error);
    }
  }
}

module.exports = SupportUserServices;
