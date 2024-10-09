const SupportUserServices = require('./supportUserServices');

class SupportController{
  static async getUserAll(req){
    return SupportUserServices.getUserAllInfoService(req);
  }

  static async getUsersPaginationCustom(req){
    return SupportUserServices.getUsersPaginationCustomService(req);
  }
}
module.exports = SupportController;