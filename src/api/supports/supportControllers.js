const SupportUserServices = require('./supportUserServices');

class SupportController{
  static async getUserAll(req){
    return SupportUserServices.getUserAllInfoService(req);
  }
}
module.exports = SupportController;