const axios = require('axios');
const config = require('../config/config');
const utils = require('../utils/utils');

class TokenService {
  constructor() {
    this.token = null;
    this.expiresAt = null;
  }

  async getToken() {
    if (this.token && this.expiresAt > new Date().getTime()) {
      return this.token;
    }

    const response = await axios.post('/token', config.tokenConfig, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    this.token = response.data.access_token;
    this.expiresAt = new Date().getTime() + response.data.expires_in * 1000;

    // Save the token in the database or in-memory storage
    await utils.saveToken(this.token);

    return this.token;
  }

  async renewToken() {
    this.token = null;
    this.expiresAt = null;
    return this.getToken();
  }
}

module.exports = new TokenService();