const pool = require("../connections/mysqlConn");
const { getCurrentUTCTimestamp } = require("../../utils/dateUtils");
const commonService = require("../../services/commonService");
const loggerService = require("../../logs/logger");

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
      now,
    ];
    try {
      const result = await pool.execute(sql, params);
      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        newsletter_id: result.insertId,
      };
    } catch (error) {
      loggerService.error(
        {
          userDetailsModel: {
            data: detailData,
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
            layer: "userDetailsModel.create",
            error: `${error}`,
          },
        },
        {},
        "[CIAM] create DB - Failed"
      );
    }
  }

  static async findByUserId(userId) {
    const sql = "SELECT * FROM user_details WHERE user_id = ?";
    const rows = await pool.query(sql, [userId]);
    return rows;
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
      id,
    ];
    try {
      await pool.execute(sql, params);
    } catch (error) {
      loggerService.error(
        {
          userDetailsModel: {
            userId: id,
            data: detailData,
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
            layer: "userDetailsModel.update",
            error: `${error}`,
          },
        },
        {},
        "[CIAM] update DB - Failed"
      );
    }
  }

  static async updateByUserId(userId, data) {
    const now = getCurrentUTCTimestamp();

    // Filter out undefined values and create SET clauses
    const updateFields = Object.entries(data)
      .filter(([key, value]) => value !== undefined)
      .map(([key, value]) => `${key} = ?`);

    // Add updated_at to the SET clauses
    updateFields.push("updated_at = ?");

    // Construct the SQL query
    const sql = `
      UPDATE user_details
      SET ${updateFields.join(", ")}
      WHERE user_id = ?
    `;

    // Prepare the params array
    const params = [
      ...Object.values(data).filter((value) => value !== undefined),
      now,
      userId,
    ];

    try {
      // Execute the query
      const result = await pool.execute(sql, params);

      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        user_id: result.insertId,
      };
    } catch (error) {
      loggerService.error(
        {
          userDetailsModel: {
            userId,
            data,
            sql_statement: commonService.replaceSqlPlaceholders(sql, [email]),
            layer: "userDetailsModel.updateByUserId",
            error: new Error(error),
          },
        },
        {},
        "[CIAM] updateByUserId DB - Failed"
      );
    }
  }

  static async delete(id) {
    const sql = "DELETE FROM user_details WHERE id = ?";
    await pool.execute(sql, [id]);
  }

  static async deletebyUserID(user_id) {
    const sql = "DELETE FROM user_details WHERE user_id = ?";
    try {
      await pool.execute(sql, [user_id]);
      return JSON.stringify({
        sql_statement: commonService.replaceSqlPlaceholders(sql, [user_id]),
      });
    } catch (error) {
      loggerService.error(
        {
          userDetailsModel: {
            userId: user_id,
            data,
            sql_statement: commonService.replaceSqlPlaceholders(sql, [email]),
            layer: "userDetailsModel.deletebyUserID",
            error: `${error}`,
          },
        },
        {},
        "[CIAM] deletebyUserID DB - Failed"
      );
      throw error;
    }
  }

  /**
   * Upsert user details
   * @param {Object} userData - User details data
   * @param {number} userData.user_id - User ID (required)
   * @param {string} [userData.phone_number] - Phone number
   * @param {string} [userData.zoneinfo] - Country code
   * @param {string} [userData.address] - Address
   * @param {string} [userData.picture] - Profile image link
   * @param {string} [userData.vehicle_iu] - Vehicle identity unit number
   * @param {string} [userData.vehicle_plate] - Vehicle plate number
   * @param {Object} [userData.extra] - Extra fields as JSON
   * @returns {Promise<Object>} Result of the operation with inserted/updated record
   */
  static async upsert(userData) {
    try {
      // Validate required fields
      if (!userData.user_id) {
        throw new Error('user_id is required');
      }

      // Prepare data for insertion/update - only include fields that are provided
      const data = { user_id: userData.user_id };

      // Only add fields that are explicitly provided
      if ('phone_number' in userData) data.phone_number = userData.phone_number;
      if ('zoneinfo' in userData) data.zoneinfo = userData.zoneinfo;
      if ('address' in userData) data.address = userData.address;
      if ('picture' in userData) data.picture = userData.picture;
      if ('vehicle_iu' in userData) data.vehicle_iu = userData.vehicle_iu;
      if ('vehicle_plate' in userData) data.vehicle_plate = userData.vehicle_plate;
      if ('extra' in userData) data.extra = userData.extra ? JSON.stringify(userData.extra) : null;

      // First check if a record with this user_id exists
      const existingRows = await pool.query(
        `SELECT id FROM user_details WHERE user_id = ?`,
        [userData.user_id]
      );

      if (existingRows.length > 0) {
        // Update existing record - only update fields that were provided
        const updateData = { ...Object.fromEntries(
              Object.entries(data).filter(([_, value]) => value !== undefined)
        )};
        delete updateData.user_id; // Remove user_id from update data

        // If there are no fields to update, just return the existing record
        if (Object.keys(updateData).length === 0) {
          return {
            success: true,
            data: await this.findByUserId(userData.user_id),
            operation: 'no-change'
          };
        }

        const updateFields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
        const updateValues = Object.values(updateData);
        const sql = `
          UPDATE user_details
          SET ${updateFields}
          WHERE user_id = ?
        `;

        await pool.execute(sql, [...updateValues, userData.user_id]);

        return {
          success: true,
          // data: await this.findByUserId(userData.user_id),
          operation: 'update'
        };
      } else {
        // Insert new record
        const columns = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');

        const query = `
          INSERT INTO user_details (${columns})
          VALUES (${placeholders})
        `;

        await pool.execute(query, Object.values(data));

        return {
          success: true,
          // data: await this.findByUserId(userData.user_id),
          operation: 'insert'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error,
        stack: process.env.APP_ENV === 'dev' ? error.stack : undefined
      };
    }
  }
}

module.exports = UserDetail;
