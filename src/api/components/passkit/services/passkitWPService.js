const ApiUtils = require('../../../../utils/apiUtils');
const passkitCcmmonService = require('./passkitCommonService');
const commonService = require('../../../../services/commonService');

require('dotenv').config();

class PasskitWPService {
  constructor() {
    this.apiEndpoint = process.env.PASSKIT_URL + process.env.PASSKIT_GEN_ALL_PATH;
  }

  /**
   * Generate Apple & Google wallet pass
   *
   * @param {json} inputData
   * @returns
   */
  async callGenPasskitAll(req) {
    req['apiTimer'] = req.processTimer.apiRequestTimer();
    req.apiTimer.log('PasskitWPService.callGenPasskitAll start'); // log process time

    try {
      const headers = await passkitCcmmonService.setPasskitReqHeader();
      const body = await this.createRequestBody(req);

      const response = await ApiUtils.makeRequest(this.apiEndpoint, 'post', headers, body);

      req.apiTimer.end('SQS PasskitWPService.callGenPasskitAll'); // log end time
      return ApiUtils.handleResponse(response);
    } catch (error) {
      req.apiTimer.end('SQS PasskitWPService.callGenPasskitAll'); // log end time
      throw new Error(`PasskitWPService error: ${error}`);
    }
  }

  async createRequestBody(req) {
    let dob = commonService.convertDateHyphenFormat(req.body.dob);

    // event data
    const event = {
      passType: req.body.group,
      name: req.body.lastName +' '+ req.body.firstName,
      dateOfBirth: dob,
      mandaiId: req.body.mandaiID,
      visualId: req.body.visualID,
      postalCode: '654321', //hardcode for now
      email: req.body.email
    };
    return event;
  }
}

module.exports = new PasskitWPService();