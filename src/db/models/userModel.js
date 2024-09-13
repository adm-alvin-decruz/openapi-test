const pool = require('../connections/mysqlConn');
const { getCurrentUTCTimestamp, convertDateToMySQLFormat } = require('../../utils/dateUtils');
const commonService = require('../../services/commonService');

class User {
  static async create(userData) {
    const now = getCurrentUTCTimestamp();
    const sql = `
      INSERT INTO users
      (email, given_name, family_name, birthdate, mandai_id, source, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      userData.email,
      userData.given_name,
      userData.family_name,
      convertDateToMySQLFormat(userData.birthdate),
      userData.mandai_id,
      userData.source,
      userData.active,
      now,
      now
    ];
    const result = await pool.execute(sql, params);

    return {
      sql_statement: commonService.replaceSqlPlaceholders(sql, params),
      user_id: result.insertId
    };
  }

  static async findById(id) {
    const sql = 'SELECT * FROM users WHERE id = ?';
    const [rows] = await pool.query(sql, [id]);
    return rows[0];
  }

  static async findByEmail(email) {
    try{
      const sql = 'SELECT * FROM users WHERE email = ?';
      const rows = await pool.query(sql, [email]);
      return rows[0];
    }
    catch (error){
      return error;
    }
  }

  /** Find wild pass user full data */
  static async findWPFullData(email){
    try{
      const sql = `SELECT u.*, um.name,um.visual_id, un.type, un.subscribe FROM users u
                  INNER JOIN user_memberships um ON um.user_id = u.id
                  INNER JOIN user_newsletters un ON un.user_id = u.id
                  WHERE u.email = ? AND u.active=1`;
      const rows = await pool.query(sql, [email]);

      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, email),
        data: rows[0]
      }
    }
    catch (error){
      throw new Error(`Error queryWPUserByEmail: ${error}`);
    }
  }

  // static async update(id, userData) {
  //   const now = getCurrentUTCTimestamp();
  //   const sql = `
  //     UPDATE users
  //     SET email = ?, given_name = ?, family_name = ?, birthdate = ?,
  //         mandai_id = ?, source = ?, active = ?, updated_at = ?
  //     WHERE id = ?
  //   `;
  //   const params = [
  //     userData.email,
  //     userData.given_name,
  //     userData.family_name,
  //     userData.birthdate,
  //     userData.mandai_id,
  //     userData.source,
  //     userData.active,
  //     now,
  //     id
  //   ];
  //   await pool.execute(sql, params);
  // }

  static async update(id, userData) {
    const now = getCurrentUTCTimestamp();

    // Filter out undefined values and create SET clauses
    const updateFields = Object.entries(userData)
      .filter(([key, value]) => value !== undefined)
      .map(([key, value]) => `${key} = ?`);

    // Add updated_at to the SET clauses
    updateFields.push('updated_at = ?');

    // Construct the SQL query
    const sql = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    // Prepare the params array
    const params = [
      ...Object.values(userData).filter(value => value !== undefined),
      now,
      id
    ];

    // Execute the query
    const result = await pool.execute(sql, params);

    return {
      sql_statement: commonService.replaceSqlPlaceholders(sql, params),
      user_id: result.insertId
    };
  }

  static async delete(id) {
    const now = getCurrentUTCTimestamp();
    const sql = 'UPDATE users SET active = false, updated_at = ? WHERE id = ?';
    await pool.execute(sql, [now, id]);
  }

  static async deletebyUserID(user_id){
    try{
      const sql = 'DELETE FROM users WHERE id = ?';
      var result = await pool.execute(sql, [user_id]);

      return JSON.stringify({
        sql_statement: commonService.replaceSqlPlaceholders(sql, [user_id]),
      });
    }
    catch (error){
      throw error;
    }
  }

  static async disableByUserID(user_id){
    try{
      const now = getCurrentUTCTimestamp();
      const sql = 'UPDATE users SET active = false, updated_at = ? WHERE id = ?';
      await pool.execute(sql, [now, user_id]);

      return JSON.stringify({
        sql_statement: commonService.replaceSqlPlaceholders(sql, [now, user_id]),
      });
    }
    catch (error){
      return error;
    }
  }
}

module.exports = User;