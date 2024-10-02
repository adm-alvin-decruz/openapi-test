const axios = require('axios');
const galaxyCmnService = require('./galaxyCommonService');
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
      const headers = await galaxyCmnService.setGlxReqHeader();
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