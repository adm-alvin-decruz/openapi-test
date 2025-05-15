const pool = require("../connections/mysqlConn");
const {getCurrentUTCTimestamp, convertDateToMySQLFormat} = require("../../utils/dateUtils");
const commonService = require("../../services/commonService");
const loggerService = require("../../logs/logger");

class PasswordVersionModel {
  static async findByUserId(userId) {
    const sql = "SELECT * FROM password_version WHERE user_id = ? ORDER BY created_at DESC";
    const params = [userId];
    try {
      return await pool.query(sql, params);
    } catch (error) {
      loggerService.error(
        {
          passwordVersion: {
            userId,
            error: new Error(error)
          },
        },
        {},
        "[CIAM-MAIN] PasswordVersionModel.findByUserId - Failed"
      );
      throw error;
    }
  }

  static async updateVersion(userId, id, version) {
    const sql = `UPDATE password_version SET version = ?, updated_at = ? WHERE user_id = ? AND id = ?`;
    const params = [
      version,
      getCurrentUTCTimestamp(),
      userId,
      id,
    ];

    try {
      // Execute the query
      await pool.execute(sql, params);

      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        success: true
      };
    } catch (error) {
      loggerService.error(
        {
          passwordVersion: {
            userId: userId,
            id: id,
            error: new Error(error),
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
          },
        },
        {},
        "[CIAM-MAIN] PasswordVersionModel.updateVersion - Failed"
      );
      return {
        success: false,
        error: error,
        stack: process.env.APP_ENV === 'dev' ? error.stack : undefined
      };
    }
  }

  static async deleteVersionNegativeByUserID(userId) {
    const sql = "DELETE FROM password_version WHERE user_id = ? AND version <= 0";
    const params = [userId];
    try {
      await pool.execute(sql, params);

      return JSON.stringify({
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
      });
    } catch (error) {
      loggerService.error(
        {
          passwordVersion: {
            userId: userId,
            error: new Error(error),
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
          },
        },
        {},
        "[CIAM-MAIN] PasswordVersionModel.deleteVersionNegativeByUserID - Failed"
      );
      throw error;
    }
  }

  static async create(userId, password, version) {
    const sql = `INSERT INTO password_version (user_id, version, password_hash) VALUES (?, ?, ?)`;
    const params = [userId, version, password];
    try {
      const rows = await pool.query(sql, params);
      return rows[0];
    } catch (error) {
      loggerService.error(
          {
            passwordVersion: {
              userId,
              error: new Error(error)
            },
          },
          {},
          "[CIAM-MAIN] PasswordVersionModel.create - Failed"
      );
      throw error;
    }
  }
}

module.exports = PasswordVersionModel;
