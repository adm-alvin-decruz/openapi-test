const pool = require('../connections/mysqlConn');
const { getCurrentUTCTimestamp } = require('../../utils/dateUtils');
const commonService = require('../../services/commonService');

class UserNewsletter {
  static async create(newsletterData) {
    const now = getCurrentUTCTimestamp();
    const sql = `
      INSERT INTO user_newsletters
      (user_id, name, type, subscribe, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      newsletterData.user_id,
      newsletterData.name,
      newsletterData.type,
      newsletterData.subscribe,
      now,
      now
    ];
    const result = await pool.execute(sql, params);
    return {
      sql_statement: commonService.replaceSqlPlaceholders(sql, params),
      newsletter_id: result.insertId
    };
  }

  static async findByUserId(userId) {
    const sql = 'SELECT * FROM user_newsletters WHERE user_id = ?';
    return await pool.query(sql, [userId]);
  }

  static async findNewsletter(user_id, data){
    try{
      const sql = 'SELECT * FROM user_newsletters WHERE user_id = ? AND name = ? AND type =?';
      const params = [
        user_id, data.name, data.type
      ];
      const rows = await pool.execute(sql, params);
      return rows[0];
    }
    catch (error){
      return error;
    }
  }

  // static async update(id, newsletterData) {
  //   const now = getCurrentUTCTimestamp();
  //   const sql = `
  //     UPDATE user_newsletters
  //     SET name = ?, type = ?, subscribe = ?, updated_at = ?
  //     WHERE id = ?
  //   `;
  //   const params = [
  //     newsletterData.name,
  //     newsletterData.type,
  //     newsletterData.subscribe,
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
      UPDATE user_newsletters
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
    const sql = 'DELETE FROM user_newsletters WHERE id = ?';
    await pool.execute(sql, [id]);
  }

  static async deletebyUserID(user_id) {
    try{
      const sql = 'DELETE FROM user_newsletters WHERE user_id = ?';
      var result = await pool.execute(sql, [user_id]);

      return JSON.stringify({
        sql_statement: commonService.replaceSqlPlaceholders(sql, [user_id]),
      });
    }
    catch (error){
      throw error;
    }
  }
}

module.exports = UserNewsletter;