const supportDBService = require('./supportDBServices');
const TokenModel = require('../../db/models/appTokenModel');

class SupportTokenServices {

  static async getTokenByClientService (req) {
    let result = {};
    let client = req.body.client;
    result = await TokenModel.getLatestToken(client);

    console.log(result);
    return result;
  }

  /**
   * Update token data
   * @param {Object} data - Input data containing id, client and optional fields
   * @returns {Promise<Object>} Updated token data
   */
 static async updateTokenData(data) {
    try {
        // Validate required parameters
        this.validateRequiredParams(data);

        // Prepare update statement
        const { sqlParts, values } = this.prepareUpdateStatement(data);

        if (sqlParts.length === 0) {
          throw new Error('No fields to update');
        }

        if (!Array.isArray(sqlParts)) {
          console.warn('sqlParts is not an array, converting to array');
          sqlParts = [sqlParts].filter(Boolean);
        }

        // Build the complete SQL statement
        const sql = `
            UPDATE app_tokens
            SET ${sqlParts.join(', ')}
            WHERE id = ? AND client = ?
        `;

        // Perform update using the model
        const result = await TokenModel.updateTokenData(sql, values);
        return result;

    } catch (error) {
        throw new Error(`Failed to update token data: ${error.message}`);
    }
  }

  /**
   * Validate required parameters
   * @param {Object} data - Input data
   * @throws {Error} If validation fails
   */
  static validateRequiredParams(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('Input data must be an object');
    }
    if (!data.id || typeof data.id !== 'number') {
        throw new Error('id is required and must be a number');
    }
    if (!data.client || typeof data.client !== 'string') {
        throw new Error('client is required and must be a string');
    }
  }

  /**
   * Calculate expires_at from token.expires_in
   * @param {Object} token - Token object containing expires_in
   * @returns {Date} Calculated expires_at date
   */
  static calculateExpiresAt(token) {
    try {
        if (!token || !token.expires_in) {
            return null;
        }
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + parseInt(token.expires_in));

        // Format the date to match MySQL DATETIME format
        const pad = (num) => num.toString().padStart(2, '0');
        const formattedDate = `${expiresAt.getFullYear()}-${pad(expiresAt.getMonth() + 1)}-${pad(expiresAt.getDate())} ${pad(expiresAt.getHours())}:${pad(expiresAt.getMinutes())}:${pad(expiresAt.getSeconds())}`;

        return formattedDate;
    } catch (error) {
        throw new Error(`Failed to calculate expires_at: ${error.message}`);
    }
  }

  /**
   * Build update data and SQL parts based on input
   * @param {Object} data - Input data
   * @returns {Object} Object containing update data and SQL parts
   */
  static prepareUpdateStatement(data) {
    try {
        const updateData = {};
        const sqlParts = [];
        const values = [];

        // Always update updated_at
        updateData.updated_at = new Date();
        sqlParts.push('updated_at = ?');
        values.push(updateData.updated_at);

        // Check and prepare token-related updates
        if (data.token !== undefined) {
            updateData.token = JSON.stringify(data.token);
            sqlParts.push('token = ?');
            values.push(updateData.token);

            // Update expires_at if token contains expires_in
            const expiresAt = this.calculateExpiresAt(data.token);
            if (expiresAt) {
                updateData.expires_at = expiresAt;
                sqlParts.push('expires_at = ?');
                values.push(updateData.expires_at);
            }
        }

        // Check and prepare credentials update
        if (data.credentials !== undefined) {
            updateData.credentials = JSON.stringify(data.credentials);
            sqlParts.push('credentials = ?');
            values.push(updateData.credentials);
        }

        // Check and prepare configuration update
        if (data.configuration !== undefined) {
            updateData.configuration = JSON.stringify(data.configuration);
            sqlParts.push('configuration = ?');
            values.push(updateData.configuration);
        }

        // Add id and client to values array for WHERE clause
        values.push(data.id);
        values.push(data.client);

        return {
            sqlParts,
            values,
            updateData
        };
    } catch (error) {
        throw new Error(`Failed to prepare update statement: ${error.message}`);
    }
  }
}

module.exports = SupportTokenServices;