// failedJobsSupportService.js
const galaxyWPService = require('../components/galaxy/services/galaxyWPService');
const supportDBService = require('./supportDBServices');
const userDBService = require('../../api/users/usersDBService');
const commonService = require('../../services/commonService');
const loggerService = require('../../logs/logger');

class supportGalaxyServices {
  constructor() {
    this.galaxyWPService = galaxyWPService;
  }

  // dynamic function caller using string method name
  async execute(methodName, ...args) {
    if (typeof this[methodName] === 'function') {
        return this[methodName](...args);
    }
    throw new Error(`Method ${methodName} not found`);
  }

  /**
   * API trigger Galaxy Import Pass Service function
   * @param {json} req
   * @returns
   */
  async triggerGalaxyImportSvc(req) {
    let result = [];
    let reqAccounts;
    if(req.body.type === 'manual'){
      reqAccounts = req.body.accounts;
      let isReqAcc = commonService.valJsonObjOrArray(reqAccounts, req);

      if (!req.body.accounts || !isReqAcc) {
        let msg = 'supportGalaxyServices.triggerGalaxyImportSvc request is empty';
        loggerService.error(msg, req);
        return msg;
      }
    }
    else if(req.body.type === 'batch'){
      // find user with empty visual ID
      reqAccounts = await supportDBService.findUserWithEmptyVisualID(req);
    }

    // loop through accounts
    for (const account of reqAccounts) {
      // push to queue for Galaxy Import Pass
      let reqBody = req.body;
      reqBody = Object.assign(req.body, account);
      req.body = reqBody;

      if (account.migrations) {
        req.body.migrations = true;
      }

      const params = {
        action: req.body.action,
        migrations: account.migrations ? account.migrations : false
      };
      result.push(await this.retriggerGalaxyTask(req, params));
    }

    return result;
  }

  /**  trigger failed job by type by UUID from failed jobs table */
  async retriggerByType(req, failedJob) {
    // alter req payload with DB data
    failedJob.processTimer = req.processTimer;
    req.body = failedJob.data.body;

    if (failedJob.name === 'GalaxyWPService' && failedJob.action === 'callMembershipPassApi') {
      // push to queue for Galaxy Import Pass
      const params = {
        action: failedJob.data.action,
        migrations: failedJob.data.body.migrations ? failedJob.data.body.migrations : false
      };
      return await this.retriggerGalaxyTask(req, params);
    }
    return false;
  }

  /**
   * Send job/task to sqs for Galaxy Import Pass
   * @param {json} req
   * @param {json} params
   * @returns
   */
  async retriggerGalaxyTask (req, params) {
    // push to queue for Galaxy Import Pass
    const galaxySQS = await galaxyWPService.galaxyToSQS(req, params.action);

    // user migration - update user_migrations table for signup & sqs status
    let dbUpdate = false;
    if(params.migrations === true){
      if(galaxySQS.$metadata.httpStatusCode === 200) {
        dbUpdate = await userDBService.updateUserMigration(req, 'signup', 'signupSQS');
      }
    }

    return {
      sqs: {status: galaxySQS.$metadata.httpStatusCode === 200 ? 'success' : 'failed', email: req.body.email},
      db: dbUpdate ? dbUpdate : 'Not require migration update'
    };
  }
}

module.exports = new supportGalaxyServices();