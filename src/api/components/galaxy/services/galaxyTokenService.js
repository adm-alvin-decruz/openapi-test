const galaxyConfig = require('../config/galaxyConfig');
const ApiUtils = require('../../../../utils/apiUtils');
const TokenModel = require('../../../../db/models/appTokenModel');
const querystring = require('querystring');

class TokenService {
  async generateToken(dbToken) {
    const data = querystring.stringify({
      grant_type: dbToken.credentials.grant_type,
      client_id: dbToken.credentials.client_id,
      client_secret: dbToken.credentials.client_secret
    });

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    const tokenURL = dbToken.configuration.token_url + dbToken.configuration.token_path;

    try {
      const response = await ApiUtils.makeRequest(tokenURL, 'post', headers, data);
      const tokenData = ApiUtils.handleResponse(response);

      const updateDBToken = await this.updateTokenToDB(dbToken, tokenData);

      return tokenData;
    } catch (error) {
      throw ApiUtils.handleError(error);
    }
  }

  async getToken(client) {
    try {
      const dbToken = await TokenModel.getLatestToken(client);
      if (!dbToken || this.isTokenExpired(dbToken)) {
        return await this.generateToken(dbToken);
      }

      return dbToken;
    } catch (error) {
      return error;
    }
  }

  async getTokenOnly(client) {
    try {
      const latestToken = await TokenModel.getLatestToken(client);
      return latestToken;
    } catch (error) {
      return error;
    }
  }

  isTokenExpired(tokenRecord) {
    const now = new Date();
    const expiresAt = new Date(tokenRecord.expires_at);
    return now > expiresAt;
  }

  async updateTokenToDB(dbToken, tokenData){
    dbToken['token'] = tokenData;
    const expiresIn = tokenData.expires_in || 0;
    dbToken['expires_at'] = new Date(Date.now() + expiresIn * 1000);

    return await TokenModel.updateTokenData(dbToken);
  }
}

module.exports = new TokenService();