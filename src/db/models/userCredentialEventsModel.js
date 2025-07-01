const pool = require("../connections/mysqlConn");
const { getCurrentUTCTimestamp } = require("../../utils/dateUtils");
const commonService = require("../../services/commonService");
const loggerService = require("../../logs/logger");

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
      const result = await pool.execute(sql, params);

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
        "[CIAM] UserCredentialEventsModel.create - Failed"
      );
    }
  }
}

module.exports = UserCredentialEventsModel;
