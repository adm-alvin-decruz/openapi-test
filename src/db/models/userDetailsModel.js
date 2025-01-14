const pool = require('../connections/mysqlConn');
const { getCurrentUTCTimestamp } = require('../../utils/dateUtils');
const commonService = require('../../services/commonService');

class UserDetail {
  static async create(detailData) {
    const now = getCurrentUTCTimestamp();
    const sql = `
      INSERT INTO user_details
      (user_id, phone_number, zoneinfo, address, picture, vehicle_iu, vehicle_plate, extra, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      detailData.user_id,
      detailData.phone_number,
      detailData.zoneinfo,
      detailData.address,
      detailData.picture,
      detailData.vehicle_iu,
      detailData.vehicle_plate,
      JSON.stringify(detailData.extra),
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
    const sql = 'SELECT * FROM user_details WHERE user_id = ?';
    const [rows] = await pool.query(sql, [userId]);
    return rows[0];
  }

  static async update(id, detailData) {
    const now = getCurrentUTCTimestamp();
    const sql = `
      UPDATE user_details
      SET phone_number = ?, zoneinfo = ?, address = ?, picture = ?,
          vehicle_iu = ?, vehicle_plate = ?, extra = ?, updated_at = ?
      WHERE id = ?
    `;
    const params = [
      detailData.phone_number,
      detailData.zoneinfo,
      detailData.address,
      detailData.picture,
      detailData.vehicle_iu,
      detailData.vehicle_plate,
      JSON.stringify(detailData.extra),
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
      UPDATE user_details
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
    const sql = 'DELETE FROM user_details WHERE id = ?';
    await pool.execute(sql, [id]);
  }

  static async deletebyUserID(user_id) {
    try{
      const sql = 'DELETE FROM user_details WHERE user_id = ?';
      var result = await pool.execute(sql, [user_id]);

      return JSON.stringify({
        sql_statement: commonService.replaceSqlPlaceholders(sql, [user_id]),
      });
    }
    catch(error){
      throw error;
    }
  }
}

module.exports = UserDetail;
