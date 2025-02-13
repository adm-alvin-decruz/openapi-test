const pool = require('../connections/mysqlConn');
const commonService = require('../../services/commonService');
const {getCurrentUTCTimestamp} = require("../../utils/dateUtils");
const loggerService = require("../../logs/logger");
const CommonErrors = require("../../config/https/errors/common");

class UserMigrationsMembershipPassesModel {
  static async updateByEmailAndBatchNo(email, batchNo, data) {
    const now = getCurrentUTCTimestamp();

    // Filter out undefined values and create SET clauses
    const updateFields = Object.entries(data)
        .filter(([key, value]) => value !== undefined)
        .map(([key, value]) => `${key} = ?`);

    // Add updated_at to the SET clauses
    updateFields.push("updated_at = ?");

    // Construct the SQL query
    const sql = `
      UPDATE user_migration_membership_passes
      SET ${updateFields.join(", ")}
      WHERE email = ? AND batch_no = FROM_UNIXTIME(?)
    `;

    // Prepare the params array
    const params = [
      ...Object.values(updateFields).filter(
          (value) => value !== undefined
      ),
      now,
      email,
      batchNo
    ];

    try {
      const result = await pool.execute(sql, params);

      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        row_affected: result && result.affectedRows ? result.affectedRows : 0
      };
    } catch (error) {
      loggerService.error(
          `Error UserMigrationsMembershipPassesModel.updateByEmailAndBatchNo. Error: ${error} - email: ${email}`,
          updateFields
      );
      throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
    }
  }
}

module.exports = UserMigrationsMembershipPassesModel;
