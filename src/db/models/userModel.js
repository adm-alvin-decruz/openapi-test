const pool = require("../connections/mysqlConn");
const {
  getCurrentUTCTimestamp,
  convertDateToMySQLFormat,
} = require("../../utils/dateUtils");
const commonService = require("../../services/commonService");
const loggerService = require("../../logs/logger");

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
      userData.created_at,
      now,
    ];
    try {
      const result = await pool.execute(sql, params);

      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        user_id: result.insertId,
      };
    } catch (error) {
      loggerService.error(
        {
          userModel: {
            userData,
            error: `${error}`,
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
          },
        },
        {},
        "[CIAM] userModel.create - Failed"
      );
    }
  }

  static async findById(id) {
    const sql = "SELECT * FROM users WHERE id = ?";
    try {
      const [rows] = await pool.query(sql, [id]);
      return rows[0];
    } catch (error) {
      loggerService.error(
        {
          userModel: {
            userId: id,
            error: `${error}`,
          },
        },
        {},
        "[CIAM] userModel.findById - Failed"
      );
    }
  }

  static async findByEmail(email) {
    try {
      const sql = "SELECT * FROM users WHERE email = ?";
      const rows = await pool.query(sql, [email]);

      // rturn the first row if it exists, otherwise return an empty array
      return rows && rows.length > 0 ? rows[0] : [];
    } catch (error) {
      loggerService.error(
        {
          userModel: {
            email,
            error: `${error}`,
          },
        },
        {},
        "[CIAM] userModel.findByEmail - Failed"
      );
      throw error;
    }
  }

  static async findByEmailMandaiId(email, mandaiId) {
    try {
      const sql = "SELECT * FROM users WHERE email = ? AND mandai_id = ?";
      const rows = await pool.query(sql, [email, mandaiId]);

      return rows[0];
    } catch (error) {
      loggerService.error(
        {
          userModel: {
            mandaiId,
            email,
            error: `${error}`,
          },
        },
        {},
        "[CIAM] userModel.findByEmailMandaiId - Failed"
      );
      throw error;
    }
  }

  /**
   * Find pass by email, visualId/s and status needs to be active
   *
   * @param {*} visualIds
   * @param {*} email
   * @param mandaiId
   * @returns
   */
  static async findActiveVisualId(visualIds, email, mandaiId) {
    const params = [visualIds];
    let whereClause = 'WHERE um.visual_id IN (?) AND u.active = 1 AND (umd.status IN (0) OR umd.status IS NULL)';

    if (email) {
      whereClause += ' AND u.email = ?';
      params.push(email);
    }

    if (mandaiId) {
      whereClause += ' AND u.mandai_id = ?';
      params.push(mandaiId);
    }

    try {
      const sql = `SELECT u.email, u.id as userId, um.id as membershipId, u.mandai_id as mandaiId, um.name as membership, um.visual_id as visualId
                  FROM users u
                  INNER JOIN user_memberships um ON um.user_id = u.id
                  INNER JOIN user_membership_details umd ON umd.user_membership_id = um.id
                ${whereClause}`;

      console.log("Find pass by email, visualId/s and status needs to be active", commonService.replaceSqlPlaceholders(sql, params))

      return await pool.query(sql, params);
    } catch (error) {
      loggerService.error(
        {
          userModel: {
            visualIds,
            email,
            error: `${error}`,
          },
        },
        {},
        "[CIAM] userModel.findActiveVisualId - Failed"
      );
      return error;
    }
  }

  /** Find users based on visualId and email and mandaiId*/
  static async findByEmailMandaiIdVisualId(visualIds, email, mandaiId, passType) {
    try {
      const sql = `SELECT u.email, u.id as userId, um.id as membershipId, u.mandai_id as mandaiId, um.name as membership, um.visual_id as visualId
                  FROM users u
                  INNER JOIN user_memberships um ON um.user_id = u.id
                  WHERE um.visual_id = ? AND u.active = 1 AND u.email = ? AND u.mandai_id = ? AND um.name = ?`;

      const rows = await pool.query(sql, [visualIds, email, mandaiId, passType]);
      return rows[0];
    } catch (error) {
      loggerService.error(
        {
          userModel: {
            visualIds,
            email,
            mandaiId,
            error: `${error}`,
          },
        },
        {},
        "[CIAM] userModel.findByEmailMandaiIdVisualId - Failed"
      );
      return error;
    }
  }

  /** Find users mandai_id for*/
  static async findFullMandaiId(email) {
    try {
      const sql = `SELECT u.id, u.birthdate, u.given_name, u.family_name, u.email, u.mandai_id as mandaiId, um.name as membership, um.visual_id as visualId
                  FROM users u
                  INNER JOIN user_memberships um ON um.user_id = u.id
                  WHERE u.active = 1 AND u.email = ?`;

      return await pool.query(sql, [email]);
    } catch (error) {
      loggerService.error(
        {
          userModel: {
            email,
            error: `${error}`,
          },
        },
        {},
        "[CIAM] userModel.findFullMandaiId - Failed"
      );
      return error;
    }
  }

  /** Find wild pass user full data */
  static async findWPFullData(email) {
    const sql = `SELECT u.*, um.name, um.visual_id, un.type, un.subscribe FROM users u
                  INNER JOIN user_memberships um ON um.user_id = u.id
                  INNER JOIN user_newsletters un ON un.user_id = u.id
                  WHERE u.email = ? AND u.active=1 AND um.name = 'wildpass'`;
    try {
      const rows = await pool.query(sql, [email]);

      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, email),
        data: rows[0],
      };
    } catch (error) {
      loggerService.error(
        {
          userModel: {
            email,
            error: `${error}`,
            sql_statement: commonService.replaceSqlPlaceholders(sql, email),
          },
        },
        {},
        "[CIAM] userModel.findWPFullData - Failed"
      );
    }
  }

  /** Find passes belong user */
  static async findPassesByUserEmailOrMandaiId(passes, email, mandaiId) {
    // build the WHERE clause dynamically based on available parameters
    let whereClause = 'WHERE u.active = 1';
    const params = [passes];

    if (email) {
      whereClause += ' AND u.email = ?';
      params.push(email);
    }

    if (mandaiId) {
      whereClause += ' AND u.mandai_id = ?';
      params.push(mandaiId);
    }
    const sql = `SELECT u.email, u.mandai_id as mandaiId, um.name as passes,
                    CASE
                        WHEN um.name in (?) THEN true
                        ELSE false
                    END AS isBelong
                  FROM users u
                  INNER JOIN user_memberships um ON um.user_id = u.id
                   ${whereClause}`;
    console.log("Find passes belong user", commonService.replaceSqlPlaceholders(sql, params))
    try {
      return await pool.query(sql, params);
    } catch (error) {
      loggerService.error(
        {
          userModel: {
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
            error: new Error(
              "userModel.findPassesByUserEmailOrMandaiId error: ",
              error
            ),
          },
        },
        {},
        "[CIAM] userModel.findPassesByUserEmailOrMandaiId - Failed"
      );
      throw new Error(
        JSON.stringify({
          dbProceed: "failed",
          error: JSON.stringify(error),
        })
      );
    }
  }

  static async update(id, userData) {
    const now = getCurrentUTCTimestamp();

    // Filter out undefined values and create SET clauses
    const updateFields = Object.entries(userData)
      .filter(([key, value]) => value !== undefined)
      .map(([key, value]) => `${key} = ?`);

    // Add updated_at to the SET clauses
    updateFields.push("updated_at = ?");

    // Construct the SQL query
    const sql = `
      UPDATE users
      SET ${updateFields.join(", ")}
      WHERE id = ?
    `;

    // Prepare the params array
    const params = [
      ...Object.values(userData).filter((value) => value !== undefined),
      now,
      id,
    ];

    try {
      // Execute the query
      await pool.execute(sql, params);

      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        user_id: id,
        success: true
      };
    } catch (error) {
      loggerService.error(
        {
          userModel: {
            userId: id,
            userData,
            error: `${error}`,
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
          },
        },
        {},
        "[CIAM] userModel.update - Failed"
      );
      return {
        success: false,
        error: error,
        stack: process.env.APP_ENV === 'dev' ? error.stack : undefined
      };
    }
  }

  static async delete(id) {
    const now = getCurrentUTCTimestamp();
    const sql = "UPDATE users SET active = false, updated_at = ? WHERE id = ?";
    await pool.execute(sql, [now, id]);
  }

  static async deletebyUserID(user_id) {
    const sql = "DELETE FROM users WHERE id = ?";
    try {
      var result = await pool.execute(sql, [user_id]);

      return JSON.stringify({
        sql_statement: commonService.replaceSqlPlaceholders(sql, [user_id]),
      });
    } catch (error) {
      loggerService.error(
        {
          userModel: {
            userId: user_id,
            error: `${error}`,
            sql_statement: commonService.replaceSqlPlaceholders(sql, [user_id]),
          },
        },
        {},
        "[CIAM] userModel.deletebyUserID - Failed"
      );
      throw error;
    }
  }

  static async disableByUserID(user_id) {
    const now = getCurrentUTCTimestamp();
    const sql = "UPDATE users SET active = false, updated_at = ? WHERE id = ?";
    try {
      await pool.execute(sql, [now, user_id]);

      return JSON.stringify({
        sql_statement: commonService.replaceSqlPlaceholders(sql, [
          now,
          user_id,
        ]),
      });
    } catch (error) {
      loggerService.error(
        {
          userModel: {
            userId: user_id,
            error: `${error}`,
            sql_statement: commonService.replaceSqlPlaceholders(sql, [
              now,
              user_id,
            ]),
          },
        },
        {},
        "[CIAM] userModel.disableByUserID - Failed"
      );
      return error;
    }
  }

  static async queryUsersWithPagination(
    page = 1,
    pageSize,
    columns = ["*"],
    filters = {}
  ) {
    const offset = (page - 1) * pageSize;
    try {
      // Validate and sanitize column names
      const validColumns = [
        "id",
        "email",
        "given_name",
        "family_name",
        "birthdate",
        "mandai_id",
        "source",
        "active",
        "created_at",
        "updated_at",
      ];

      // Ensure columns is an array
      let selectedColumns = Array.isArray(columns) ? columns : [columns];

      // Handle '*' case
      if (selectedColumns.includes("*") || selectedColumns[0] === "*") {
        selectedColumns = validColumns;
      } else {
        selectedColumns = selectedColumns.filter((col) =>
          validColumns.includes(col)
        );
      }

      if (selectedColumns.length === 0) {
        throw new Error("No valid columns selected");
      }

      // Construct WHERE clause based on filters
      const whereConditions = [];
      const values = [];
      for (const [key, value] of Object.entries(filters)) {
        if (validColumns.includes(key)) {
          whereConditions.push(`${key} = ?`);
          values.push(value);
        }
      }
      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      // Construct the query
      const query = `
        SELECT ${selectedColumns.join(", ")}
        FROM users
        ${whereClause}
        ORDER BY id
        LIMIT ? OFFSET ?
      `;

      // Add LIMIT and OFFSET values
      values.push(pageSize + 1, offset); // Fetch one extra to check for next page

      const rows = await pool.query(query, values);
      console.log(commonService.replaceSqlPlaceholders(query, values));

      const hasNextPage = rows.length > pageSize;
      const results = rows.slice(0, pageSize); // Remove the extra item if it exists

      return {
        users: results,
        currentPage: page,
        nextPage: hasNextPage ? page + 1 : null,
        pageSize: pageSize,
        totalResults: results.length,
      };
    } catch (error) {
      loggerService.error(
        {
          userModel: {
            error: `${error}`,
          },
        },
        {},
        "[CIAM] userModel.queryUsersWithPagination - Failed"
      );
      let logError = new Error(
        `Error in userModel.queryUsersWithPagination: ${error}`
      );

      return { error: logError };
    }
  }

  static async queryUserMembershipPassesActiveByEmail(email) {
    const sql = `SELECT u.id as userId, u.email, u.given_name as firstName, u.family_name as lastName, u.birthdate as dob, u.mandai_id as mandaiId,
                    MAX(CASE WHEN um.name <> 'wildpass' THEN 1 ELSE 0 END) AS hasMembershipPasses,
                    MAX(CASE WHEN um.name = 'wildpass' THEN 1 ELSE 0 END) AS hasWildpass,
                    MAX(
                        CASE 
                            WHEN umd.status = 0 THEN 1  -- Active membership
                            WHEN umd.status IS NULL AND (umd.valid_until IS NULL OR umd.valid_until >= CURDATE()) THEN 1
                            ELSE 0
                        END
                    ) AS status
                 FROM users u
                 LEFT JOIN user_memberships um ON um.user_id = u.id
                 LEFT JOIN user_membership_details umd ON umd.user_membership_id = um.id
                 WHERE u.email = ? AND u.active = 1
                 GROUP BY u.email, u.given_name, u.family_name, u.birthdate, u.mandai_id`;
    try {
      const rows = await pool.query(sql, [email]);

      return rows[0];
    } catch (error) {
      loggerService.error(
        {
          userModel: {
            email,
            error: `${error}`,
            sql_statement: commonService.replaceSqlPlaceholders(sql, email),
          },
        },
        {},
        "[CIAM] userModel.queryUserMembershipPassesActiveByEmail - Failed"
      );
    }
  }

  static async findByEmailOrMandaiId(email, mandaiId) {
     // Build the WHERE clause dynamically based on available parameters
    let sql = 'SELECT * FROM users WHERE ';
    const params = [];
    if (email !== null) {
      sql += 'email = ?';
      params.push(email);

      if (mandaiId !== null) {
        sql += ' OR mandai_id = ?';
        params.push(mandaiId);
      }
    } else {
      // Only mid is defined
      sql += 'mandai_id = ?';
      params.push(mandaiId);
    }

    try {
      const rows = await pool.query(sql, params);
      return rows[0];
    } catch (error) {
      loggerService.error(
          {
            userModel: {
              email,
              error: `${error}`,
              sql_statement: commonService.replaceSqlPlaceholders(sql, params),
            },
          },
          {},
          "[CIAM] userModel.findByEmailOrMandaiId - Failed"
      );
      throw error;
    }
  }
}

module.exports = User;
