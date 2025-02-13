const pool = require("../connections/mysqlConn");

class Configs {
  static async findByConfigKey(config, key) {
    const sql = "SELECT * FROM configs WHERE config = ? AND `key` = ?";
    const [rows] = await pool.query(sql, [config, key]);
    return rows[0];
  }
}

module.exports = Configs;
