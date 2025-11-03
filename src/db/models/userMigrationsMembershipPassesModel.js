const pool = require('../connections/mysqlConn');
const commonService = require('../../services/commonService');
const loggerService = require('../../logs/logger');

class UserMigrationsMembershipPassesModel {
  static async updateByEmailAndBatchNo(email, batchNo, data) {
    const sql = `
        UPDATE user_migration_membership_passes
        SET
          pass_request = ?, co_member_request = ?,
          updated_at = NOW()
        WHERE email = ? AND batch_no = FROM_UNIXTIME(?)
      `;
    const params = [data.pass_request, data.co_member_request, email, batchNo];
    try {
      const result = await pool.execute(sql, params);

      console.log({
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        user_id: result.info,
      });

      return result;
    } catch (error) {
      loggerService.error(
        {
          UserMigrationsMembershipPassesModel: {
            error: `${error}`,
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
          },
        },
        {},
        'UserMigrationsMembershipPassesModel.updateByEmailAndBatchNo',
      );
      throw new Error(`UserMigrationsMembershipPassesModel.updateByEmailAndBatchNo: ${error}`);
    }
  }
}

module.exports = UserMigrationsMembershipPassesModel;
