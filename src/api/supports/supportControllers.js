const SupportUserServices = require('./supportUserServices');
const SupportSwitchesServices = require('./supportSwitchesServices');

class SupportController{
  static async getUserAll (req) {
    return SupportUserServices.getUserAllInfoService(req);
  }

  static async getAllSwitches () {
    return SupportSwitchesServices.getAllSwitchesService();
  }

  static async updateSwitches (req) {
    return SupportSwitchesServices.updateSwitchesService(req);
  }

  static async getUsersPaginationCustom(req){
    return SupportUserServices.getUsersPaginationCustomService(req);
  }

  static async batchPatchUser(req){
    return SupportUserServices.batchPatchUserService(req);
  }
}
module.exports = SupportController;