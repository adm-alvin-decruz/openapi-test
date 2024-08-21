const axios = require('axios');
const tokenService = require('./tokenService');
const utils = require('../utils/utils');

class QueryTicketService {
  async callQueryTicket(inputData) {
    const token = await tokenService.getToken();
    const body = utils.mapInputToBody(inputData);

    const response = await axios.post('/QueryTicket-UATV1', body, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  }
}

module.exports = new QueryTicketService();