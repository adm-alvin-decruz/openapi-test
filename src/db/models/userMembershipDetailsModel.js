const pool = require("../connections/mysqlConn");
const { getCurrentUTCTimestamp } = require("../../utils/dateUtils");
const commonService = require("../../services/commonService");
const CommonErrors = require("../../config/https/errors/commonErrors");
const loggerService = require("../../logs/logger");

class UserMembershipDetails {
  static async create(membershipDetailsData) {
    const now = getCurrentUTCTimestamp();

    const sql = `
      INSERT INTO user_membership_details
      (user_id, user_membership_id, category_type, item_name, plu, adult_qty, child_qty, status, parking, iu, car_plate, membership_photo, member_first_name, member_last_name, member_email, member_dob, member_country, member_identification_no, member_phone_number, co_member, valid_from, valid_until, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      membershipDetailsData.user_id,
      membershipDetailsData.user_membership_id,
      membershipDetailsData.category_type,
      membershipDetailsData.item_name,
      membershipDetailsData.plu,
      membershipDetailsData.adult_qty,
      membershipDetailsData.child_qty,
      membershipDetailsData.status,
      membershipDetailsData.parking,
      membershipDetailsData.iu,
      membershipDetailsData.car_plate,
      membershipDetailsData.membership_photo,
      membershipDetailsData.member_first_name,
      membershipDetailsData.member_last_name,
      membershipDetailsData.member_email,
      membershipDetailsData.member_dob,
      membershipDetailsData.member_country,
      membershipDetailsData.member_identification_no,
      membershipDetailsData.member_phone_number,
      membershipDetailsData.co_member,
      membershipDetailsData.valid_from,
      membershipDetailsData.valid_until,
      now,
      now
    ];

    try {
      const result = await pool.execute(sql, params);

      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        user_membership_details_id: result.insertId,
      };
    } catch (error) {
      loggerService.error(
        {
          UserMembershipDetailsModel: {
            error: `${error}`,
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
          },
        },
        {},
        "UserMembershipDetails.create"
      );
      throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
    }
  }

  static async updateByMembershipId(membershipId, updatedDetailsData) {
    const now = getCurrentUTCTimestamp();

    // Filter out undefined values and create SET clauses
    const updateFields = Object.entries(updatedDetailsData)
      .filter(([key, value]) => value !== undefined)
      .map(([key, value]) => `${key} = ?`);

    // Add updated_at to the SET clauses
    updateFields.push("updated_at = ?");

    // Construct the SQL query
    const sql = `
      UPDATE user_membership_details
      SET ${updateFields.join(", ")}
      WHERE user_membership_id = ?
    `;

    // Prepare the params array
    const params = [
      ...Object.values(updatedDetailsData).filter(
        (value) => value !== undefined
      ),
      now,
      membershipId,
    ];

    try {
      const result = await pool.execute(sql, params);

      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        user_membership_details_id: result.insertId,
        row_affected: result && result.affectedRows ? result.affectedRows : 0,
      };
    } catch (error) {
      loggerService.error(
        {
          UserMembershipDetailsModel: {
            error: `${error}`,
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
          },
        },
        {},
        "UserMembershipDetails.updateByMembershipId"
      );
      throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
    }
  }
}

module.exports = UserMembershipDetails;
