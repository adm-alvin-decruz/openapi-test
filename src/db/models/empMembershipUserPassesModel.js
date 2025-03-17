const pool = require("../connections/mysqlConn");
const commonService = require("../../services/commonService");
const { getCurrentUTCTimestamp } = require("../../utils/dateUtils");
const loggerService = require("../../logs/logger");
const CommonErrors = require("../../config/https/errors/common");

class EmpMembershipUserPassesModel {
  static async updatePassState(reqBody, data) {
    const now = getCurrentUTCTimestamp();

    // Filter out undefined values and create SET clauses
    const updateFields = Object.entries(data)
      .filter(([key, value]) => value !== undefined)
      .map(([key, value]) => `${key} = ?`);

    // Add updated_at to the SET clauses
    updateFields.push("updated_at = ?");

    // Construct the SQL query
    const sql = `UPDATE emp_membership_user_passes
                  SET ${updateFields.join(", ")}
                  WHERE email = ? AND pass_id = ?`;

    // Prepare the params array
    const params = [
      ...Object.values(data).filter((value) => value !== undefined),
      now,
      reqBody.email,
      reqBody.passId
    ];

    // Execute the query
    try {
      const result = await pool.execute(sql, params);

      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        user_id: result.insertId,
      };
    } catch (error) {
      loggerService.error(
        {
          EmpMembershipUserPassesModel: {
            error: `${error}`,
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
          },
        },
        {},
        "EmpMembershipUserPassesModel.updatePassState"
      );
      throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
    }
  }
}

module.exports = EmpMembershipUserPassesModel;
