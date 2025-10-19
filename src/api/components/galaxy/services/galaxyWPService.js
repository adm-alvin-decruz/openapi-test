const ApiUtils = require('../../../../utils/apiUtils');
const galaxyConf = require('../config/galaxyConfig');
const galaxyCmnService = require('./galaxyCommonService');
require('dotenv').config();

const awsRegion = () => {
  const env = process.env.PRODUCTION;
  if (!env) return 'ap-southeast-1';
  if (env === 'false') return 'ap-southeast-1';
  return env;
};
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const sqsClient = new SQSClient({ region: awsRegion });

class GalaxyWPService {
  constructor() {
    this.apiImportEndpoint = process.env.GALAXY_URL + process.env.GALAXY_IMPORT_PASS_PATH;
    this.apiUpdateEndpoint = process.env.GALAXY_URL + process.env.GALAXY_UPDATE_PASS_PATH;
  }

  async callMembershipPassApi(req) {
    req['apiTimer'] = req.processTimer.apiRequestTimer();
    req.apiTimer.log('GalaxyWPService.callMembershipPassApi starts');
    const inputData = req.body;
    try {
      const headers = await galaxyCmnService.setGlxReqHeader();
      const body = await this.createRequestBody(inputData, galaxyConf.importWPParams);

      const response = await ApiUtils.makeRequest(this.apiImportEndpoint, 'post', headers, body);

      req.apiTimer.end('GalaxyWPService.callMembershipPassApi'); // log end time
      return ApiUtils.handleResponse(response);
    } catch (error) {
      console.log(new Error(`GalaxyWPService.callMembershipPassApi Error ${error}`));
      req.apiTimer.end('GalaxyWPService.callMembershipPassApi Error'); // log end time
      return error;
    }
  }

  async createRequestBody(inputData, galaxyParams) {
    return galaxyCmnService.mapImputToImportParams(inputData, galaxyParams);
  }

  async callMembershipUpdatePassApi(inputData) {
    try {
      const headers = await galaxyCmnService.setGlxReqHeader();
      const body = await this.createRequestBody(inputData, galaxyConf.updateWPParams);

      const response = await ApiUtils.makeRequest(this.apiUpdateEndpoint, 'post', headers, body);

      return ApiUtils.handleResponse(response);
    } catch (error) {
      return error;
    }
  }

  async callMembershipUpdateStatus(requiredFields, status) {
    try {
      const headers = await galaxyCmnService.setGlxReqHeader();
      const requiredBody = await this.createRequestBody(requiredFields, galaxyConf.updateWPParams);
      const body = {
        ...requiredBody,
        status,
      };

      // makeRequest already calls ApiUtils.handleResponse so we should not call it again
      const data = await ApiUtils.makeRequest(this.apiUpdateEndpoint, 'post', headers, body);

      return data;
    } catch (error) {
      throw new Error(`GalaxyWPService.callMembershipUpdateStatus error: ${error.message}`);
    }
  }

  async galaxyToSQS(req, action) {
    try {
      req['apiTimer'] = req.processTimer.apiRequestTimer();
      req.apiTimer.log('GalaxyWPService.galaxyToSQS starts');

      let data = { action: action, body: req.body };

      const queueUrl = process.env.SQS_QUEUE_URL;
      // send SQS
      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(data),
      });

      let result = await sqsClient.send(command);

      req.apiTimer.end('GalaxyWPService.galaxyToSQS'); // log end time
      return result;
    } catch (error) {
      console.error(new Error(`GalaxyWPService.galaxyToSQS Error ${error}`));
    }
  }

  /**
   * testing only
   * TODO: remove when test done
   */
  async importWPToGlx(inputData) {
    return this.createRequestBody(inputData);
  }
}

module.exports = new GalaxyWPService();
