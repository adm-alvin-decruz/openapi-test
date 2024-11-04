const pool = require('../connections/mysqlConn');
const { getCurrentUTCTimestamp, convertDateToMySQLFormat } = require('../../utils/dateUtils');
const commonService = require('../../services/commonService');

class UserMigrationsModel {
  constructor() {
    this.tableName = 'user_migrations';
  }

  static async create(data) {
    const sql = `
      INSERT INTO ${this.tableName}
      (email, user_id, dispatch_sqs, signup_request, passkit_email, passkit_req, batch_no, pass_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?), ?, NOW(), NOW())
    `;
    const params = [
      data.email,
      data.user_id,
      data.dispatch_sqs,
      data.signup_request,
      data.passkit_email,
      data.passkit_req,
      data.batch_no,
      data.pass_type
    ];
    return pool.execute(sql, params);
  }

  static async update(email, batchNo, data) {
    try{
      const sql = `
        UPDATE user_migrations
        SET
          signup = ?, signup_sqs = ?,
          updated_at = NOW()
        WHERE email = ? AND batch_no = FROM_UNIXTIME(?)
      `;
      const params = [
        data.signup,
        data.signup_sqs,
        email,
        batchNo
      ];
      const result = await pool.execute(sql, params);

      console.log( {
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        user_id: result.info
      });

      return result;
    } catch (error) {
      throw new Error (`UserMigrationModel: ${error}`);
    }
  }

  static async findByEmailAndBatch(email, batchNo) {
    const sql = `SELECT * FROM ${this.tableName} WHERE email = ? AND batch_no = DATE(?)`;
    const params = [email, batchNo];
    return query(sql, params);
  }

  replaceSqlPlaceholders(sql, params) {
    let index = 0;
    return sql.replace(/\?/g, () => {
      const value = params[index++];
      if (typeof value === 'string') {
        return `'${value.replace(/'/g, "''")}'`;
      } else if (value === null) {
        return 'NULL';
      } else {
        return value;
      }
    });
  }

  static async runCustomSQL(sql, params){
    const result = await pool.execute(sql, params);

    console.log( {
      sql_statement: commonService.replaceSqlPlaceholders(sql, params),
      user_id: result.info
    });
  }

}

module.exports = UserMigrationsModel;