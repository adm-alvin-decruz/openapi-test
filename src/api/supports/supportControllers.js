const SupportUserServices = require('./supportUserServices');
const SupportSwitchesServices = require('./supportSwitchesServices');
const SupportConfigsServices = require('./supportConfigsServices');
const SupportTokenServices = require('./supportTokenServices');
const SupportFailedJobsServices = require('./supportFailedJobsService');
const SupportGalaxyServices = require('./supportGalaxyServices');
const processTimer = require('../../utils/processTimer');
const validationService = require('../../services/validationService');
const loggerService = require('../../logs/logger');


class SupportController{
  // to add process timer
  static addProcessTimer(req) {
    req['processTimer'] = processTimer;
    req['apiTimer'] = req.processTimer.apiRequestTimer(true); // log time durations

    return req;
  }

  static async getUserAll (req) {
    return SupportUserServices.getUserAllInfoService(req);
  }

  static async getAllSwitches () {
    return SupportSwitchesServices.getAllSwitchesService();
  }

  static async updateSwitches (req) {
    return SupportSwitchesServices.updateSwitchesService(req);
  }

  static async createSwitches (body) {
    return SupportSwitchesServices.createSwitch(body);
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

  static async getFailedJobs(req, res) {
    return await this.failedJobsCtrlToService(req, res, 'getFailedJobsWithPagination')
  }

  static async triggerFailedJobsCtr(req, res) {
    return await this.failedJobsCtrlToService(req, res, 'receivedTriggerReq')
  }

  static async failedJobsCtrlToService(req, res, faileJobMethodName) {
    req = SupportController.addProcessTimer(req);
    const startTimer = process.hrtime();

    // validate req app-id
    var valAppID = validationService.validateAppID(req.headers, 'support');

    if(valAppID === true){
      let jobs;
      try {
        jobs = await SupportFailedJobsServices.execute(faileJobMethodName, req);
        res.status(200).json({ status: jobs.status, jobs: jobs });
      } catch (error) {
        console.error(`SupportController.failedJobsCtrlToService error: ${error}`);
        res.status(500).json({ status: 'failed', error: error.message });
      }
      req.apiTimer.end('[CIAM-SUPPORT] get failed jobs ended', startTimer);
    }
    else{
      return res.status(401).send({ error: 'Unauthorized' });
    }
  }

  static async triggerGalaxyWPImportCtrl(req, res) {
    return await this.supportGalaxyFunc(req, res, 'triggerGalaxyImportSvc')
  }

  static async supportGalaxyFunc(req, res, faileJobMethodName) {
    req = SupportController.addProcessTimer(req);
    const startTimer = process.hrtime();

    // validate req app-id
    var valAppID = validationService.validateAppID(req.headers, 'support');

    if(valAppID === true){
      let jobs;
      try {
        jobs = await SupportGalaxyServices.execute(faileJobMethodName, req);
        res.status(200).json({ status: jobs.status, jobs: jobs });
      } catch (error) {
        loggerService.error(new Error(`SupportController.supportGalaxyFunc error: ${error}`), req);
        res.status(500).json({ status: 'failed', error: error.message });
      }
      req.apiTimer.end('[CIAM-SUPPORT] galaxy jobs ended', startTimer);
    }
    else{
      return res.status(401).send({ error: 'Unauthorized' });
    }
  }

  static async getByConfigs(config) {
    return SupportConfigsServices.getByConfigs(config);
  }
  static async createConfig(body) {
    return SupportConfigsServices.createConfig(body);
  }
  static async deleteConfigById(id) {
    return SupportConfigsServices.deleteConfigById(id);
  }
  static async updateConfigById(id, body) {
    return SupportConfigsServices.updateConfigById(id, body);
  }
}

module.exports = SupportController;
