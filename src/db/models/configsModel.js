const pool = require("../connections/mysqlConn");
const loggerService = require("../../logs/logger");
const commonService = require("../../services/commonService");

class Configs {
  static async findByConfigKey(config, key) {
    const sql = "SELECT * FROM configs WHERE config = ? AND `key` = ?";
    try {
      const [rows] = await pool.query(sql, [config, key]);
      return rows;
    } catch (error) {
      loggerService.error(
        {
          configModel: {
            config,
            key,
            error: `${error}`,
            sql_statement: commonService.replaceSqlPlaceholders(sql, email),
          },
        },
        {},
        "[CIAM] userModel.findWPFullData - Failed"
      );
    }
  }
}

module.exports = Configs;
