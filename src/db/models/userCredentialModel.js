const pool = require('../connections/mysqlConn');
const { getCurrentUTCTimestamp } = require('../../utils/dateUtils');

class UserCredential {
  static async create(credentialData) {
    const now = getCurrentUTCTimestamp();
    const sql = `
      INSERT INTO user_credentials
      (user_id, username, password_hash, tokens, last_login, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      credentialData.user_id,
      credentialData.username,
      credentialData.password_hash,
      JSON.stringify(credentialData.tokens),
      credentialData.last_login,
      now,
      now
    ];
    const result = await pool.execute(sql, params);
    return result.insertId;
  }

  static async findByUserId(userId) {
    const sql = 'SELECT * FROM user_credentials WHERE user_id = ?';
    const [rows] = await pool.query(sql, [userId]);
    return rows[0];
  }

  static async update(id, credentialData) {
    const now = getCurrentUTCTimestamp();
    const sql = `
      UPDATE user_credentials
      SET username = ?, password_hash = ?, tokens = ?, last_login = ?, updated_at = ?
      WHERE id = ?
    `;
    const params = [
      credentialData.username,
      credentialData.password_hash,
      JSON.stringify(credentialData.tokens),
      credentialData.last_login,
      now,
      id
    ];
    await pool.execute(sql, params);
  }

  static async delete(id) {
    const sql = 'DELETE FROM user_credentials WHERE id = ?';
    await pool.execute(sql, [id]);
  }
}

module.exports = UserCredential;