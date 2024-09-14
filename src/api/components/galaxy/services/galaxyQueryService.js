const axios = require('axios');
const galaxyTokenService = require('./galaxyTokenService');
const ApiUtils = require('../../../../utils/apiUtils');

/**
 * Class that handle Galaxy Query
 */
class GalaxyQueryService {
  constructor() {
    this.apiEndpoint = process.env.GALAXY_URL + process.env.GALAXY_QUERY_TICKET_PATH;
  }

  async callQueryTicketApi(inputData) {
    try {
      const dbToken = await galaxyTokenService.getToken('galaxy');
      let tokenType = '';
      let accessToken = '';
      if(dbToken.token){
        tokenType = dbToken.token.token_type;
        accessToken = dbToken.token.access_token;
      }else{
        tokenType = dbToken.token_type;
        accessToken = dbToken.access_token;
      }

      const headers = {
        'Authorization': `${tokenType} ${accessToken}`,
        'Content-Type': 'application/json'
      };

      const body = this.createRequestBody(inputData);

      const response = await ApiUtils.makeRequest(this.apiEndpoint, 'get', headers, body);

      return ApiUtils.handleResponse(response);
    } catch (error) {

      throw ApiUtils.handleError(error);
    }
  }

  createRequestBody(inputData) {
    return {
      VisualID: [inputData.visualID]
    };
  }
}

module.exports = new GalaxyQueryService();