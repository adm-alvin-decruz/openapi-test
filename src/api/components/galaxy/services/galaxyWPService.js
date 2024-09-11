const ApiUtils = require('../../../../utils/apiUtils');
const galaxyTokenService = require('./galaxyTokenService');
const galaxyConf = require('../config/galaxyConfig');
const galaxyCmnService = require('./galaxyCommonService');
require('dotenv').config();

class GalaxyWPService {
  constructor() {
    this.apiImportEndpoint = process.env.GALAXY_URL + process.env.GALAXY_IMPORT_PASS_PATH;
    this.apiUpdateEndpoint = process.env.GALAXY_URL + process.env.GALAXY_UPDATE_PASS_PATH;
  }

  async callMembershipPassApi(inputData) {
    try {
      const dbToken = await galaxyTokenService.getToken('galaxy');
      const token  = dbToken.token;

      const headers = {
        'Authorization': `${token.token_type} ${token.access_token}`,
        'Content-Type': 'application/json'
      };

      const body = await this.createRequestBody(inputData, galaxyConf.importWPParams);

      const response = await ApiUtils.makeRequest(this.apiImportEndpoint, 'post', headers, body);
      return ApiUtils.handleResponse(response);
    } catch (error) {
      return error
    }
  }

  async createRequestBody(inputData, galaxyParams) {
    return await galaxyCmnService.mapImputToImportParams(inputData, galaxyParams);
  }

  async callMembershipUpdatePassApi(inputData){
    try {
      const dbToken = await galaxyTokenService.getToken('galaxy');
      const token  = dbToken.token;

      const headers = {
        'Authorization': `${token.token_type} ${token.access_token}`,
        'Content-Type': 'application/json'
      };

      const body = await this.createRequestBody(inputData, galaxyConf.updateWPParams);

      const response = await ApiUtils.makeRequest(this.apiUpdateEndpoint, 'post', headers, body);
      // console.log(response);
      return ApiUtils.handleResponse(response);
    } catch (error) {
      return error
    }
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