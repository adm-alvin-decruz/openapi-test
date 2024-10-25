const SupportUserServices = require('./supportUserServices');
const SupportSwitchesServices = require('./supportSwitchesServices');
const SupportTokenServices = require('./supportTokenServices');
const processTimer = require('../../utils/processTimer');
const validationService = require('../../services/validationService');

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

  static async getTokenByClient(req){
    return SupportTokenServices.getTokenByClientService(req);
  }

  static async updateToken(req, res){
    req['processTimer'] = processTimer;
    req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations
    const startTimer = process.hrtime();

    // validate req app-id
    var valAppID = validationService.validateAppID(req.headers, 'support');

    if(valAppID === true){
      let token;
      try {
        token = await SupportTokenServices.updateTokenData(req.body);
        res.status(200).json({ success: true, token: token });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
      req.apiTimer.end('[CIAM-SUPPORT] get token ended', startTimer);
    }
    else{
      return res.status(401).send({ error: 'Unauthorized' });
    }
  }
}
module.exports = SupportController;