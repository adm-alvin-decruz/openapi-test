const axios = require('axios');
const tokenService = require('./tokenService');
const utils = require('../utils/utils');

class MembershipPassRB1A1CService {
  async callMembershipPassRB1A1C(inputData) {
    const token = await tokenService.getToken();
    const body = utils.mapInputToBody(inputData);

    const response = await axios.post('/MembershipPass-RB1A1C', body, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  }
}

module.exports = new MembershipPassRB1A1CService();