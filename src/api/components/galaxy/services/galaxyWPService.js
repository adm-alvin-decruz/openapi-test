const axios = require('axios');
const tokenService = require('./tokenService');
const utils = require('../utils/utils');

class MembershipPassWPService {
  async callMembershipPassWP(inputData) {
    const token = await tokenService.getToken();
    const body = utils.mapInputToBody(inputData);

    const response = await axios.post('/MembershipPass-WP', body, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  }
}

module.exports = new MembershipPassWPService();