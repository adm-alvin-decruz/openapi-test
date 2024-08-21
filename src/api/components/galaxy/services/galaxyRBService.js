const axios = require('axios');
const tokenService = require('./tokenService');
const utils = require('../utils/utils');

class MembershipPassRBService {
  async callMembershipPassRB(inputData) {
    const token = await tokenService.getToken();
    const body = utils.mapInputToBody(inputData);

    const response = await axios.post('/MembershipPass-RB', body, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  }
}

module.exports = new MembershipPassRBService();