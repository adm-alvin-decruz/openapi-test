const pool = require('../connections/mysqlConn');
const { getCurrentUTCTimestamp } = require('../../utils/dateUtils');
const commonService = require('../../services/commonService');
const loggerService = require('../../logs/logger');

class UserEvenAuditTrailModel {
  static async create(email, userId, eventData) {
    const sql = `
      INSERT INTO user_event_audit_trail
      (email, user_id, event_type, data, source, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      email,
      userId,
      eventData.eventType,
      JSON.stringify(eventData.data),
      eventData.source,
      eventData.status,
      getCurrentUTCTimestamp(),
      getCurrentUTCTimestamp(),
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
          UserEvenAuditTrailModel: {
            error: new Error(error),
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
          },
        },
        {},
        '[CIAM] UserEvenAuditTrailModel.create - Failed',
      );
    }
  }
}

module.exports = UserEvenAuditTrailModel;
