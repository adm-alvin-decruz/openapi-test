const pool = require("../connections/mysqlConn");
const { getCurrentUTCTimestamp } = require("../../utils/dateUtils");
const commonService = require("../../services/commonService");
const CommonErrors = require("../../config/https/errors/commonErrors");
const loggerService = require("../../logs/logger");

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
      now,
    ];

    try {
      const result = await pool.execute(sql, params);

      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        membership_id: result.insertId,
      };
    } catch (error) {
      loggerService.error(
        {
          UserMembershipModel: {
            error: `${error}`,
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
          },
        },
        {},
        "UserMembership.create"
      );
      throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
    }
  }

  static async findByUserId(userId) {
    const sql = "SELECT * FROM user_memberships WHERE user_id = ?";
    return await pool.query(sql, [userId]);
  }

  static async findByUserIdAndGroup(userId, group) {
    const sql = "SELECT * FROM user_memberships WHERE user_id = ? and name = ?";
    return await pool.query(sql, [userId, group]);
  }

  static async findByUserIdAndExcludeGroup(userId, group) {
    const sql =
      "SELECT * FROM user_memberships WHERE user_id = ? and name != ?";
    return await pool.query(sql, [userId, group]);
  }

  static async findByVisualId(visualId) {
    const sql = "SELECT * FROM user_memberships WHERE visual_id = ?";
    return await pool.query(sql, [visualId]);
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
      id,
    ];
    await pool.execute(sql, params);
  }

  //update by naming of updateByMembershipId
  static async updateByUserId(userId, data) {
    const now = getCurrentUTCTimestamp();

    // Filter out undefined values and create SET clauses
    const updateFields = Object.entries(data)
      .filter(([key, value]) => value !== undefined)
      .map(([key, value]) => `${key} = ?`);

    // Add updated_at to the SET clauses
    updateFields.push("updated_at = ?");

    //TODO: need to add one more condition: membershipId (id)
    // Construct the SQL query
    const sql = `
      UPDATE user_memberships
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
          UserMembershipModel: {
            error: `${error}`,
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
          },
        },
        {},
        "UserMembership.updateByUserId"
      );
      throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
    }
  }

  static async updateByMembershipId(membershipId, data) {
    const now = getCurrentUTCTimestamp();

    // Filter out undefined values and create SET clauses
    const updateFields = Object.entries(data)
        .filter(([key, value]) => value !== undefined)
        .map(([key, value]) => `${key} = ?`);

    // Add updated_at to the SET clauses
    updateFields.push("updated_at = ?");

    // Construct the SQL query
    const sql = `
      UPDATE user_memberships
      SET ${updateFields.join(", ")}
      WHERE id = ?
    `;

    // Prepare the params array
    const params = [
      ...Object.values(data).filter((value) => value !== undefined),
      now,
      membershipId,
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
            UserMembershipModel: {
              error: `${error}`,
              sql_statement: commonService.replaceSqlPlaceholders(sql, params),
            },
          },
          {},
          "UserMembership.updateByUserId"
      );
      throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
    }
  }

  static async delete(id) {
    const now = getCurrentUTCTimestamp();
    const sql = "DELETE FROM user_memberships WHERE id = ?";
    await pool.execute(sql, [id]);
  }

  static async deletebyUserID(user_id) {
    try {
      const sql = "DELETE FROM user_memberships WHERE user_id = ?";
      var result = await pool.execute(sql, [user_id]);

      return JSON.stringify({
        sql_statement: commonService.replaceSqlPlaceholders(sql, [user_id]),
      });
    } catch (error) {
      throw error;
    }
  }

  static async queryMembershipDetailsByMembershipId(membershipId) {
    const sql = `SELECT u.mandai_id as mandaiId, umd.member_email as memberEmail, umd.member_first_name as firstName, umd.member_last_name as lastName, CONCAT(umd.member_dob) as dob,
                        um.visual_id as visualId, um.name as passType, CONCAT(umd.valid_until) as expiredAt, umd.category_type as membershipType,
                        umd.co_member as familyMembers, umd.status as status
                 FROM users u
                 LEFT JOIN user_memberships um ON um.user_id = u.id
                 LEFT JOIN user_membership_details umd ON umd.user_membership_id = um.id
                 WHERE um.id = ?`;
    try {
      const rows = await pool.query(sql, [membershipId]);

      return rows[0];
    } catch (error) {
      loggerService.error(
          {
            UserMembershipModel: {
              error: `${error}`,
              sql_statement: commonService.replaceSqlPlaceholders(sql, [membershipId]),
            },
          },
          {},
          "[CIAM] UserMembership.queryMembershipDetailsByMembershipId - Failed"
      );
    }
  }

  static async queryUserPassType(email) {
    const sql = `SELECT u.id AS userId, u.email, u.mandai_id AS mandaiId, JSON_ARRAYAGG(um.name) AS passType
                    FROM users u
                    LEFT JOIN user_memberships um ON um.user_id = u.id
                    WHERE u.email = ?
                    GROUP BY u.id, u.email, u.mandai_id`
    try {
      const rows = await pool.query(sql, [email]);
      return rows[0];
    } catch (error) {
      loggerService.error(
          {
            UserMembershipModel: {
              error: new Error(error),
              sql_statement: commonService.replaceSqlPlaceholders(sql, [email]),
            },
          },
          {},
          "[CIAM-MAIN] UserMembershipModel.queryUserPassType - Failed"
      );
    }
  }
}

module.exports = UserMembership;
