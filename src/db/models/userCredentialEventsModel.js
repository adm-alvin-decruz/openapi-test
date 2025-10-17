const { query, execute } = require('../connections/mysqlConn');
const { getCurrentUTCTimestamp } = require('../../utils/dateUtils');
const commonService = require('../../services/commonService');
const loggerService = require('../../logs/logger');
const { EVENTS, STATUS } = require('../../utils/constants');

class UserCredentialEventsModel {
  static async create(userId, eventData) {
    const sql = `
      INSERT INTO user_credential_events
      (user_id, event_type, data, source, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      userId,
      eventData.eventType,
      JSON.stringify(eventData.data),
      eventData.source,
      eventData.status,
      getCurrentUTCTimestamp(),
      getCurrentUTCTimestamp(),
    ];
    try {
      const result = await execute(sql, params);

      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        user_id: result.insertId,
      };
    } catch (error) {
      loggerService.error(
        {
          UserCredentialEventsModel: {
            error: new Error(error),
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
          },
        },
        {},
        '[CIAM] UserCredentialEventsModel.create - Failed',
      );
      throw error;
    }
  }

  static async updateAwsSession(id, eventData) {
    const sql = `UPDATE user_credential_events
      SET data = ?
      WHERE id = ?`;
    const params = [JSON.stringify(eventData), id];
    try {
      await execute(sql, params);

      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        id,
      };
    } catch (error) {
      loggerService.error(
        {
          UserCredentialEventsModel: {
            error: new Error(error),
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
          },
        },
        {},
        '[CIAM] UserCredentialEventsModel.updateAwsSession - Failed',
      );
      throw error;
    }
  }

  /**
   * Get the most recent successful login for a user
   * @param {*} userId
   * @returns timestamp of last successful login
   */
  static async getLastSuccessfulLogin(userId) {
    const sql = `
      SELECT created_at
      FROM user_credential_events
      WHERE user_id = ?
        AND event_type = ?
        AND status = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const params = [userId, EVENTS.VERIFY_OTP, STATUS.SUCCESS];

    try {
      const rows = await query(sql, params);

      return rows.length > 0 ? rows[0].created_at : null;
    } catch (error) {
      loggerService.error(
        {
          UserCredentialEventsModel: {
            error: new Error(error),
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
          },
        },
        {},
        '[CIAM] UserCredentialEventsModel.getLastSuccessfulLogin - Failed',
      );
      throw error;
    }
  }

  static async countOtpGenerationsSinceLastSuccess(userId) {
    const lastSuccess = await this.getLastSuccessfulLogin(userId);

    let sql, params;

    try {
      if (lastSuccess) {
        sql = `
          SELECT COUNT(*) as count
          FROM user_credential_events
          WHERE user_id = ?
            AND event_type = ?
            AND created_at > ?
            AND status = ?
        `;
        params = [userId, EVENTS.SEND_OTP, lastSuccess, STATUS.SUCCESS];
      } else {
        // If no successful login yet - count all OTP generations
        // But only within last 24 hours to prevent indefinite blocking
        sql = `
          SELECT COUNT(*) as count
          FROM user_credential_events
          WHERE user_id = ?
            AND event_type = ?
            AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            AND status = ?
        `;
        params = [userId, EVENTS.SEND_OTP, STATUS.SUCCESS];
      }

      const [rows] = await query(sql, params);
      return rows.length > 0 ? rows[0].count : 0;
    } catch (error) {
      loggerService.error(
        {
          UserCredentialEventsModel: {
            error: new Error(error),
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
          },
        },
        {},
        '[CIAM] UserCredentialEventsModel.countOtpGenerationsSinceLastSuccess - Failed',
      );
      throw error;
    }
  }

  /**
   * Get last login event
   * @param {*} userId
   * @returns timestamp of last login event
   */
  static async getLastLoginEvent(userId) {
    const sql = `SELECT data, created_at
      FROM user_credential_events
      WHERE user_id = ?
        AND event_type IN (?, ?)
      ORDER BY created_at DESC
      LIMIT 1`;
    const params = [userId, EVENTS.SEND_OTP, EVENTS.VERIFY_OTP];

    try {
      const rows = await query(sql, params);

      return rows.length > 0 ? rows[0].created_at : null;
    } catch (error) {
      loggerService.error(
        {
          UserCredentialEventsModel: {
            error: new Error(error),
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
          },
        },
        {},
        '[CIAM] UserCredentialEventsModel.getLastLoginEvent - Failed',
      );
      throw error;
    }
  }

  /**
   * Get last send OTP event
   * @param {*} userId
   * @returns timestamp of last send OTP event
   */
  static async getLastSendOTPEvent(userId) {
    const sql = `SELECT id, data, created_at
      FROM user_credential_events
      WHERE user_id = ?
        AND event_type = ?
        AND status = ?
      ORDER BY created_at DESC
      LIMIT 1`;
    const params = [userId, EVENTS.SEND_OTP, STATUS.SUCCESS];

    try {
      const rows = await query(sql, params);

      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      loggerService.error(
        {
          UserCredentialEventsModel: {
            error: new Error(error),
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
          },
        },
        {},
        '[CIAM] UserCredentialEventsModel.getLastSendOTPEvent - Failed',
      );
      throw error;
    }
  }
}

module.exports = UserCredentialEventsModel;
