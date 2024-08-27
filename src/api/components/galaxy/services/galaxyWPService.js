const ApiUtils = require('../../../../utils/apiUtils');
const galaxyTokenService = require('./galaxyTokenService');
const galaxyConf = require('../config/galaxyConfig');
const galaxyCmnService = require('./galaxyCommonService');

class MembershipPassService {
  constructor() {
    this.apiEndpoint = 'https://uat-connect.mandaiapi.com/api/MembershipPass';
  }

  async callMembershipPassApi(inputData) {
    try {
      const dbToken = await galaxyTokenService.getToken('galaxy');
      const token  = dbToken.token;

      const headers = {
        'Authorization': `${token.token_type} ${token.access_token}`,
        'Content-Type': 'application/json'
      };

      const body = await this.createRequestBody(inputData);

      const response = await ApiUtils.makeRequest(this.apiEndpoint, 'post', headers, body);
      return ApiUtils.handleResponse(response);
    } catch (error) {
      return error
    }
  }

  async createRequestBody(inputData) {
    let wpImportParams = galaxyConf.importWPParams;
    return await galaxyCmnService.mapImputToImportParams(inputData, wpImportParams);
  }

  /**
   * testing only
   * TODO: remove when test done
   */
  async importWPToGlx(inputData){
    return this.createRequestBody(inputData);
  }
}

module.exports = new MembershipPassService();