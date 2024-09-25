const ApiUtils = require('../../../../utils/apiUtils');
const galaxyConf = require('../config/galaxyConfig');
const galaxyCmnService = require('./galaxyCommonService');
require('dotenv').config();

const awsRegion = () => {
  const env = process.env.PRODUCTION;
  if (!env) return 'ap-southeast-1';
  if (env === "false") return 'ap-southeast-1';
  return env;
}
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const sqsClient = new SQSClient({ region: awsRegion });

class GalaxyWPService {
  constructor() {
    this.apiImportEndpoint = process.env.GALAXY_URL + process.env.GALAXY_IMPORT_PASS_PATH;
    this.apiUpdateEndpoint = process.env.GALAXY_URL + process.env.GALAXY_UPDATE_PASS_PATH;
  }

  async callMembershipPassApi (req) {
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
      req.apiTimer.end('GalaxyWPService.callMembershipPassApi Error'); // log end time
      return error
    }
  }

  async createRequestBody (inputData, galaxyParams) {
    return await galaxyCmnService.mapImputToImportParams(inputData, galaxyParams);
  }

  async callMembershipUpdatePassApi (inputData) {
    try {
      const headers = await galaxyCmnService.setGlxReqHeader();
      const body = await this.createRequestBody(inputData, galaxyConf.updateWPParams);

      const response = await ApiUtils.makeRequest(this.apiUpdateEndpoint, 'post', headers, body);
      // console.log(response);
      return ApiUtils.handleResponse(response);
    } catch (error) {
      return error
    }
  }

  async galaxyToSQS (req) {
    req['apiTimer'] = req.processTimer.apiRequestTimer();
    req.apiTimer.log('GalaxyWPService.galaxyToSQS starts');

    const queueUrl = process.env.SQS_QUEUE_URL;
    // send SQS
    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(req.body),
    });

    await sqsClient.send(command);
    req.apiTimer.end('GalaxyWPService.galaxyToSQS'); // log end time
  }

  /**
   * testing only
   * TODO: remove when test done
   */
  async importWPToGlx(inputData){
    return this.createRequestBody(inputData);
  }
}

module.exports = new GalaxyWPService();