const pool = require('../connections/mysqlConn');
const { getCurrentUTCTimestamp } = require('../../utils/dateUtils');

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
    return result.insertId;
  }

  static async findByUserId(userId) {
    const sql = 'SELECT * FROM user_newsletters WHERE user_id = ?';
    return await pool.query(sql, [userId]);
  }

  static async update(id, newsletterData) {
    const now = getCurrentUTCTimestamp();
    const sql = `
      UPDATE user_newsletters
      SET name = ?, type = ?, subscribe = ?, updated_at = ?
      WHERE id = ?
    `;
    const params = [
      newsletterData.name,
      newsletterData.type,
      newsletterData.subscribe,
      now,
      id
    ];
    await pool.execute(sql, params);
  }

  static async delete(id) {
    const sql = 'DELETE FROM user_newsletters WHERE id = ?';
    await pool.execute(sql, [id]);
  }
}

module.exports = UserNewsletter;