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
    try{
      const sql = 'SELECT * FROM app_tokens WHERE client = ?';
      const rows = await pool.query(sql, [client]);
      return rows[0];
    }
    catch (error){
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

  static async updateTokenData(dbToken) {
    const now = getCurrentUTCTimestamp();
    const sql = 'UPDATE app_tokens SET token = ?, expires_at = ?, updated_at = ? WHERE id = ?';

    const params = [
      JSON.stringify(dbToken.token),
      formatDateToMySQLDateTime(dbToken.expires_at),
      now,
      dbToken.id
    ];

    const result = await pool.execute(sql, params);

    return {
      sql_statement: commonService.replaceSqlPlaceholders(sql, params),
      update_result: result
    };
  }
}

module.exports = AppTokenModel;