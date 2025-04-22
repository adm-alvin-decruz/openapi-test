const pool = require("../connections/mysqlConn");
const loggerService = require("../../logs/logger");
const commonService = require("../../services/commonService");

class Configs {
  static async findByConfigKey(config, key) {
    const params = [config, key];
    const sql = "SELECT * FROM configs WHERE config = ? AND `key` = ?";
    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (error) {
      loggerService.error(
        {
          configModel: {
            config,
            key,
            error: new Error(error),
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
          },
        },
        {},
        "[CIAM-MAIN] configsModel.findByConfigKey - Failed"
      );
    }
  }
}

module.exports = Configs;
