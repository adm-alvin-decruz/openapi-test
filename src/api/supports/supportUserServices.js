const supportDBService = require('./supportDBServices');

class SupportUserServices {

  static async getUserAllInfoService (req){
    return supportDBService.getUserFullInfoByEmail(req.body.email);
  }
}

module.exports = SupportUserServices;