const pool = require('../connections/mysqlConn');
const { getCurrentUTCTimestamp } = require('../../utils/dateUtils');
const commonService = require('../../services/commonService');
const CommonErrors = require('../../config/https/errors/commonErrors');
const loggerService = require('../../logs/logger');

class UserCredential {
  static async create(credentialData) {
    const now = getCurrentUTCTimestamp();
    const sql = `
      INSERT INTO user_credentials
      (user_id, username, password_hash, tokens, last_login, user_sub_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      credentialData.user_id,
      credentialData.username,
      credentialData.password_hash,
      credentialData.tokens,
      credentialData.last_login,
      credentialData.user_sub_id,
      now,
      now,
    ];
    const result = await pool.execute(sql, params);
    return {
      sql_statement: commonService.replaceSqlPlaceholders(sql, params),
      newsletter_id: result.insertId,
    };
  }

  static async findByUserId(userId) {
    const sql = 'SELECT * FROM user_credentials WHERE user_id = ?';
    const [rows] = await pool.query(sql, [userId]);
    return rows[0];
  }

  static async findByUserEmail(email) {
    const sql = 'SELECT * FROM user_credentials WHERE username = ?';
    const [rows] = await pool.query(sql, [email]);
    return rows;
  }

  static async findByUserEmailOrMandaiId(email, mandaiId) {
    const sql = `SELECT * FROM users u
                INNER JOIN user_credentials uc ON uc.username = u.email
                WHERE (u.email = ? OR u.mandai_id = ?) AND status = 1`;
    const [rows] = await pool.query(sql, [email, mandaiId]);
    return rows;
  }

  static async findByPasswordHash(password) {
    const sql = 'SELECT * FROM user_credentials WHERE password_hash = ?';
    const [rows] = await pool.query(sql, [password]);
    return rows;
  }

  static async findUserHasFirstLogin(email) {
    const sql = `SELECT uc.username, uc.password_hash, uc.salt as password_salt
                  FROM user_credentials uc
                  WHERE uc.username = ? AND uc.last_login IS NULL AND uc.tokens IS NULL`;
    try {
      const [rows] = await pool.query(sql, [email]);
      return rows;
    } catch (error) {
      loggerService.error(
        {
          userCredentialModel: {
            email,
            sql_statement: commonService.replaceSqlPlaceholders(sql, [email]),
            layer: 'userCredentialModel.findUserHasFirstLogin',
            error: `${error}`,
          },
        },
        {},
        '[CIAM] findUserHasFirstLogin DB - Failed',
      );
      return error;
    }
  }

  static async updateByUserEmail(username, data) {
    const now = getCurrentUTCTimestamp();

    // Filter out undefined values and create SET clauses
    const updateFields = Object.entries(data)
      .filter(([_key, value]) => value !== undefined)
      .map(([key, _value]) => `${key} = ?`);

    // Add updated_at to the SET clauses
    updateFields.push('updated_at = ?');

    // Construct the SQL query
    const sql = `
      UPDATE user_credentials
      SET ${updateFields.join(', ')}
      WHERE username = ?
    `;

    // Prepare the params array
    const params = [...Object.values(data).filter((value) => value !== undefined), now, username];

    loggerService.log(
      {
        userCredentialModel: {
          email: username,
          sql_statement: commonService.replaceSqlPlaceholders(sql, params),
          layer: 'userCredentialModel.updateByUserEmail',
        },
      },
      '[CIAM] updateByUserEmail DB - Start',
    );

    // Execute the query
    try {
      const result = await pool.execute(sql, params);
      loggerService.log(
        {
          userCredentialModel: {
            email: username,
            layer: 'userCredentialModel.updateByUserEmail',
          },
        },
        '[CIAM] updateByUserEmail DB - Success',
      );
      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        user_id: result.changedRows,
        success: true,
      };
    } catch (error) {
      loggerService.error(
        {
          userCredentialModel: {
            email: username,
            data: data,
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
            layer: 'userCredentialModel.updateByUserEmail',
            error: `${error}`,
          },
        },
        {},
        '[CIAM] updateByUserEmail DB - Failed',
      );
      throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
    }
  }

  static async updateByUserId(userId, data) {
    const now = getCurrentUTCTimestamp();

    // Filter out undefined values and create SET clauses
    const updateFields = Object.entries(data)
      .filter(([_key, value]) => value !== undefined)
      .map(([key, _value]) => `${key} = ?`);

    // Add updated_at to the SET clauses
    updateFields.push('updated_at = ?');

    // Construct the SQL query
    const sql = `
      UPDATE user_credentials
      SET ${updateFields.join(', ')}
      WHERE user_id = ?
    `;

    // Prepare the params array
    const params = [...Object.values(data).filter((value) => value !== undefined), now, userId];

    // Execute the query
    try {
      const result = await pool.execute(sql, params);

      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        user_id: result.insertId,
      };
    } catch (error) {
      loggerService.error(
        {
          userCredentialModel: {
            userId: userId,
            data: data,
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
            layer: 'userCredentialModel.updateByUserId',
            error: new Error(error),
          },
        },
        {},
        '[CIAM] updateByUserId DB - Failed',
      );
      throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
    }
  }

  static async delete(id) {
    const sql = 'DELETE FROM user_credentials WHERE id = ?';
    await pool.execute(sql, [id]);
  }

  static async deletebyUserID(user_id) {
    const sql = 'DELETE FROM user_credentials WHERE user_id = ?';
    await pool.execute(sql, [user_id]);

    return JSON.stringify({
      sql_statement: commonService.replaceSqlPlaceholders(sql, [user_id]),
    });
  }

  static async updateByUserIdAndEmail(email, userId, data) {
    const now = getCurrentUTCTimestamp();

    // Filter out undefined values and create SET clauses
    const updateFields = Object.entries(data)
      .filter(([_key, value]) => value !== undefined)
      .map(([key, _value]) => `${key} = ?`);

    // Add updated_at to the SET clauses
    updateFields.push('updated_at = ?');

    // Construct the SQL query
    const sql = `
      UPDATE user_credentials
      SET ${updateFields.join(', ')}
      WHERE username = ? AND user_id = ?
    `;

    // Prepare the params array
    const params = [
      ...Object.values(data).filter((value) => value !== undefined),
      now,
      email,
      userId,
    ];

    loggerService.log(
      {
        userCredentialModel: {
          email,
          userId,
          sql_statement: commonService.replaceSqlPlaceholders(sql, params),
          layer: 'userCredentialModel.updateByUserIdAndEmail',
        },
      },
      '[CIAM] updateByUserIdAndEmail DB - Start',
    );

    // Execute the query
    try {
      const result = await pool.execute(sql, params);
      loggerService.log(
        {
          userCredentialModel: {
            email,
            userId,
            layer: 'userCredentialModel.updateByUserIdAndEmail',
          },
        },
        '[CIAM] updateByUserIdAndEmail DB - Success',
      );
      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        user_id: result.changedRows,
        success: true,
      };
    } catch (error) {
      loggerService.error(
        {
          userCredentialModel: {
            email,
            userId,
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
            layer: 'userCredentialModel.updateByUserIdAndEmail',
            error: new Error(error),
          },
        },
        {},
        '[CIAM] updateByUserIdAndEmail DB - Failed',
      );
      throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
    }
  }
}

module.exports = UserCredential;
