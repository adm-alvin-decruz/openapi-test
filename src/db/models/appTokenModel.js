const pool = require('../connections/mysqlConn');
const { getCurrentUTCTimestamp, formatDateToMySQLDateTime } = require('../../utils/dateUtils');
const commonService = require('../../services/commonService');

class AppTokenModel {
  static async saveToken(tokenData) {
    return new Promise((resolve, reject) => {
      const query = 'INSERT INTO app_tokens SET ?';
      pool.query(query, tokenData, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  static async getLatestToken(client) {
    try {
      const sql = 'SELECT * FROM app_tokens WHERE client = ?';
      const rows = await pool.query(sql, [client]);
      return rows[0];
    } catch (error) {
      return error;
    }
  }

  // static async updateToken(tokenData) {
  //   return new Promise((resolve, reject) => {
  //     const query = 'UPDATE app_tokens SET ?';
  //     pool.execute(query, tokenData, (err) => {
  //       if (err) reject(err);
  //       else resolve();
  //     });
  //   });
  // }

  /**
   * Update token data in database
   * @param {string} sql - SQL statement
   * @param {Array} values - Values for prepared statement
   * @returns {Promise<Object>} Updated token data
   */
  static async updateTokenData(sql, params) {
    try {
      const result = await pool.execute(sql, params);

      if (result.affectedRows === 0) {
        throw new Error('No rows updated. Invalid id or client.');
      }

      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        update_result: result,
      };
    } catch (error) {
      console.log(new Error(`Database error: ${error}`));
    }
  }

  static async updateTokenByClient(client, token) {
    try {
      const sql = `
        UPDATE app_tokens
        SET
          token = ?,
          updated_at = NOW()
        WHERE client = ?`;
      const params = [token, client];
      const result = await pool.execute(sql, params);

      console.log({
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        user_id: result.info,
      });

      return result;
    } catch (error) {
      console.log(new Error(`Database error: ${error}`));
    }
  }
}

module.exports = AppTokenModel;
