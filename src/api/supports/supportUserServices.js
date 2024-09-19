const supportDBService = require('./supportDBServices');
const supportCognitoService = require('./supportCognitoServices');

class SupportUserServices {

  static async getUserAllInfoService (req){
    let result = {};
    result['db'] = await supportDBService.getUserFullInfoByEmail(req);
    result['cognito'] = await supportCognitoService.getUserCognitoInfo(req);

    console.log(result);
    return result;
  }
}

module.exports = SupportUserServices;