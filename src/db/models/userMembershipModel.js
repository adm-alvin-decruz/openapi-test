const pool = require('../connections/mysqlConn');
const { getCurrentUTCTimestamp, convertDateToMySQLFormat } = require('../../utils/dateUtils');
const commonService = require('../../services/commonService');

class UserMembership {
  static async create(membershipData) {
    const now = getCurrentUTCTimestamp();
    if(membershipData.expires_at !== null){
      membershipData['expires_at'] = convertDateToMySQLFormat(membershipData.expires_at);
    }
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

    return {
      sql_statement: commonService.replaceSqlPlaceholders(sql, params),
      membership_id: result.insertId
    };
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

  static async updateByUserId(userId, data) {
    const now = getCurrentUTCTimestamp();

    // Filter out undefined values and create SET clauses
    const updateFields = Object.entries(data)
        .filter(([key, value]) => value !== undefined)
        .map(([key, value]) => `${key} = ?`);

    // Add updated_at to the SET clauses
    updateFields.push('updated_at = ?');

    // Construct the SQL query
    const sql = `
      UPDATE user_memberships
      SET ${updateFields.join(', ')}
      WHERE user_id = ?
    `;

    // Prepare the params array
    const params = [
      ...Object.values(data).filter(value => value !== undefined),
      now,
      userId
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
    const sql = 'DELETE FROM user_memberships WHERE id = ?';
    await pool.execute(sql, [id]);
  }

  static async deletebyUserID(user_id) {
    try{
      const sql = 'DELETE FROM user_memberships WHERE user_id = ?';
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

module.exports = UserMembership;
