const pool = require("../connections/mysqlConn");
const commonService = require("../../services/commonService");

class UserMigrationsMembershipPassesModel {
  static async updateByEmailAndBatchNo(email, batchNo, data) {
    try {
      const sql = `
        UPDATE user_migration_membership_passes
        SET
          pass_request = ?, co_member_request = ?,
          updated_at = NOW()
        WHERE email = ? AND batch_no = FROM_UNIXTIME(?)
      `;
      const params = [
        data.pass_request,
        data.co_member_request,
        email,
        batchNo,
      ];
      const result = await pool.execute(sql, params);

      console.log({
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        user_id: result.info,
      });

      return result;
    } catch (error) {
      throw new Error(`UserMigrationsMembershipPassesModel: ${error}`);
    }
  }
}

module.exports = UserMigrationsMembershipPassesModel;
