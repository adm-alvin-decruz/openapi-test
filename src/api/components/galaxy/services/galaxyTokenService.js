const ApiUtils = require('../../../../utils/apiUtils');
const TokenModel = require('../../../../db/models/appTokenModel');
const querystring = require('querystring');
const SupportTokenServices = require('../../../supports/supportTokenServices');

class TokenService {
  async generateToken(dbToken) {
    const data = querystring.stringify({
      grant_type: dbToken.credentials.grant_type,
      client_id: dbToken.credentials.client_id,
      client_secret: dbToken.credentials.client_secret,
    });

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    const tokenURL = dbToken.configuration.token_url + dbToken.configuration.token_path;

    try {
      // ApiUtils.makeRequest already calls handleResponse and returns the parsed data (response.data)
      const tokenData = await ApiUtils.makeRequest(tokenURL, 'post', headers, data);

      await this.updateTokenToDB(dbToken, tokenData);
      return tokenData;
    } catch (error) {
      throw ApiUtils.handleError(error);
    }
  }

  async getToken(client) {
    try {
      const dbToken = await TokenModel.getLatestToken(client);
      if (!dbToken || this.isTokenExpired(dbToken)) {
        return this.generateToken(dbToken);
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

  async updateTokenToDB(dbToken, tokenData) {
    dbToken['token'] = tokenData;
    const expiresIn = tokenData.expires_in || 0;
    dbToken['expires_at'] = new Date(Date.now() + expiresIn * 1000);
    let { sqlParts, values } = SupportTokenServices.prepareUpdateStatement(dbToken);

    // Build the complete SQL statement
    const sql = `
            UPDATE app_tokens
            SET ${sqlParts.join(', ')}
            WHERE id = ? AND client = ?
        `;

    return TokenModel.updateTokenData(sql, values);
  }

  async useToken() {
    const dbToken = await this.getToken('galaxy');
    let tokenType = '';
    let accessToken = '';
    if (dbToken.token) {
      tokenType = dbToken.token.token_type;
      accessToken = dbToken.token.access_token;
    } else {
      tokenType = dbToken.token_type;
      accessToken = dbToken.access_token;
    }

    return {
      token_type: tokenType,
      access_token: accessToken,
    };
  }
}

module.exports = new TokenService();
