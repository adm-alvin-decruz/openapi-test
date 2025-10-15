const { query, execute } = require('../connections/mysqlConn');
const commonService = require('../../services/commonService');
const loggerService = require('../../logs/logger');

class PasswordlessToken {
  static async findLatestTokenByEmail(email) {
    const sql = `
      SELECT * 
      FROM passwordless_tokens 
      WHERE email = ?
      ORDER BY expires_at DESC 
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
      SET verification_attempts = verification_attempts + 1 
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
