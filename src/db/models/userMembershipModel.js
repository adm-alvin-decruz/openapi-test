const pool = require('../connections/mysqlConn');
const { getCurrentUTCTimestamp } = require('../../utils/dateUtils');

class UserMembership {
  static async create(membershipData) {
    const now = getCurrentUTCTimestamp();
    const sql = `
      INSERT INTO user_memberships
      (user_id, name, visual_id, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      membershipData.user_id,
      membershipData.name,
      membershipData.visual_id,
      membershipData.expires_at,
      now,
      now
    ];
    const result = await pool.execute(sql, params);
    return result.insertId;
  }

  static async findByUserId(userId) {
    const sql = 'SELECT * FROM user_memberships WHERE user_id = ?';
    return await pool.query(sql, [userId]);
  }

  static async update(id, membershipData) {
    const now = getCurrentUTCTimestamp();
    const sql = `
      UPDATE user_memberships
      SET name = ?, visual_id = ?, expires_at = ?, updated_at = ?
      WHERE id = ?
    `;
    const params = [
      membershipData.name,
      membershipData.visual_id,
      membershipData.expires_at,
      now,
      id
    ];
    await pool.execute(sql, params);
  }

  static async delete(id) {
    const now = getCurrentUTCTimestamp();
    const sql = 'DELETE FROM user_memberships WHERE id = ?';
    await pool.execute(sql, [id]);
  }
}

module.exports = UserMembership;