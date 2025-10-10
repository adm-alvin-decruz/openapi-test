const { query, execute } = require('../connections/mysqlConn');
const { formatDateToMySQLDateTime } = require('../../utils/dateUtils');
const commonService = require('../../services/commonService');
const loggerService = require('../../logs/logger');

class PasswordlessToken {
  static async create(tokenData) {
    const sql = `
      INSERT INTO passwordless_tokens
      (email, hash, salt, requested_at, expired_at, attempt, is_used)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const formattedRequestedAt = formatDateToMySQLDateTime(
      new Date(tokenData.requestedAt || new Date()), // default to now if not provided
    );

    const formattedExpiredAt = formatDateToMySQLDateTime(new Date(tokenData.expiredAt));

    const params = [
      tokenData.email,
      tokenData.hash,
      tokenData.salt || '',
      formattedRequestedAt,
      formattedExpiredAt,
      0,
      tokenData.isUsed || 0,
    ];

    try {
      const result = await execute(sql, params);

      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        token_id: result.insertId,
      };
    } catch (error) {
      loggerService.error(
        {
          passwordlessTokenModel: {
            tokenData,
            error: `${error}`,
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
          },
        },
        {},
        '[CIAM] passwordlessTokenModel.create - Failed',
      );
    }
  }

  static async findLatestTokenByEmail(email) {
    const sql = `
      SELECT * 
      FROM passwordless_tokens 
      WHERE email = ?
      ORDER BY expired_at DESC 
      LIMIT 1
    `;

    try {
      const rows = await query(sql, [email]);
      return rows[0];
    } catch (error) {
      loggerService.error(
        {
          passwordlessTokenModel: {
            email,
            error: `${error}`,
          },
        },
        {},
        '[CIAM] passwordlessTokenModel.findLatestByEmail - Failed',
      );
    }
  }

  static async getTokenById(id) {
    const sql = `
      SELECT *
      FROM passwordless_tokens
      WHERE id = ?
    `;

    try {
      const rows = await query(sql, [id]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      loggerService.error(
        {
          passwordlessTokenModel: {
            id,
            error: `${error}`,
          },
        },
        {},
        '[CIAM] passwordlessTokenModel.getTokenById - Failed',
      );
    }
  }

  static async incrementAttemptById(id) {
    const sql = `
      UPDATE passwordless_tokens 
      SET attempt = attempt + 1 
      WHERE id = ?
    `;

    try {
      await execute(sql, [id]);

      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, [id]),
        token_id: id,
        success: true,
      };
    } catch (error) {
      loggerService.error(
        {
          passwordlessTokenModel: {
            id,
            error: `${error}`,
          },
        },
        {},
        '[CIAM] passwordlessTokenModel.incrementAttemptById - Failed',
      );
      throw error;
    }
  }

  static async markTokenAsInvalid(id) {
    const sql = `
      UPDATE passwordless_tokens 
      SET is_valid = 0 
      WHERE id = ?
    `;

    try {
      const result = await execute(sql, [id]);

      return result.affectedRows > 0;
    } catch (error) {
      loggerService.error(
        {
          passwordlessTokenModel: {
            id,
            error: `${error}`,
          },
        },
        {},
        '[CIAM] passwordlessTokenModel.markTokenById - Failed',
      );
      throw error;
    }
  }

  static async addSessionToToken(id, session) {
    const sql = `
      UPDATE passwordless_tokens
      SET aws_session = ?
      WHERE id = ?
    `;

    try {
      const result = await execute(sql, [session, id]);

      return result.affectedRows > 0;
    } catch (error) {
      loggerService.error(
        {
          passwordlessTokenModel: {
            id,
            error: `${error}`,
          },
        },
        {},
        '[CIAM] passwordlessTokenModel.addSessionToToken - Failed',
      );
      throw error;
    }
  }

  static async getSession(id) {
    const sql = `
      SELECT aws_session
      FROM passwordless_tokens
      WHERE id = ?
    `;

    try {
      const rows = await query(sql, [id]);
      return rows[0];
    } catch (error) {
      loggerService.error(
        {
          passwordlessTokenModel: {
            id,
            error: `${error}`,
          },
        },
        {},
        '[CIAM] passwordlessTokenModel.getSession - Failed',
      );
      throw error;
    }
  }
}

module.exports = PasswordlessToken;
