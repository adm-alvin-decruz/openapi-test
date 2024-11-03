const pool = require('../connections/mysqlConn');
const { getCurrentUTCTimestamp, convertDateToMySQLFormat } = require('../../utils/dateUtils');
const commonService = require('../../services/commonService');

class FailedJobsModel {
  constructor() {
    this.pool = pool;
    this.commonService = commonService;
    this.tableName = 'failed_jobs';
  }

  async create(jobData) {
    const {uuid,name,action,data,source,triggered_at,status} = jobData;

    const query = `
      INSERT INTO ${this.tableName}
      (uuid, name, action, data, source, triggered_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const result = await this.pool.execute(query, [
        uuid,
        name,
        action,
        JSON.stringify(data),
        source,
        triggered_at,
        status
      ]);
      return result.insertId;
    } catch (error) {
      console.error( new Error(`[FailedJobsModel] Failed to create job: ${error.message}`) );
    }
  }

  async upsert(jobData) {
    const {uuid,name,action,data,source,triggered_at,status} = jobData;

    // Using MySQL's ON DUPLICATE KEY UPDATE
    const query = `
      INSERT INTO failed_jobs
      (uuid, name, action, data, source, triggered_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      triggered_at = VALUES(triggered_at),
      data = VALUES(data)
    `;

    const params = [
      uuid,
        name,
        action,
        JSON.stringify(data),
        source,
        triggered_at,
        status
    ];
    const result = await this.pool.execute(query, params);
    console.log('[FailedJobsModel] Success insert failed job:', result);
  } catch (error) {
    console.error( new Error(`[FailedJobsModel] Failed to create job: ${error.message}`) );
  }


  async findById(id) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE id = ?
    `;

    try {
      const [rows] = await this.pool.execute(query, [id]);
      return rows[0];
    } catch (error) {
      throw new Error(`Failed to find job: ${error.message}`);
    }
  }

  async findByUuid(uuid) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE uuid = ?
    `;

    try {
      const [rows] = await this.pool.execute(query, [uuid]);
      return rows;
    } catch (error) {
      throw new Error(`Failed to find job: ${error.message}`);
    }
  }

  async update(id, updateData) {
    const allowedFields = ['status', 'triggered_at'];
    const updates = [];
    const values = [];

    Object.entries(updateData).forEach(([key, value]) => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(key === 'status' ? value : value);
      }
    });

    if (updates.length === 0) return false;

    const sql = `
      UPDATE ${this.tableName}
      SET ${updates.join(', ')}
      WHERE id = ?
    `;
    console.log("FailedJobsModel.update statement", commonService.replaceSqlPlaceholders(sql, [...values, id]))
    try {
      const result = await this.pool.execute(sql, [...values, id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error(new Error(`[FailedJobModel][Update] Failed to update failed jobs table: ${error}`));
    }
  }

  async delete(id) {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE id = ?
    `;

    try {
      const [result] = await this.pool.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Failed to delete job: ${error.message}`);
    }
  }

  async findFailedJobs(limit = 10) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE status = 3
      ORDER BY created_at DESC
      LIMIT ?
    `;

    try {
      const [rows] = await this.pool.execute(query, [limit]);
      return rows;
    } catch (error) {
      throw new Error(`Failed to fetch failed jobs: ${error.message}`);
    }
  }

  async query(sql, params) {
    console.log("FailedJobsModel.query statement", commonService.replaceSqlPlaceholders(sql, params))
    try{
      const rows = await this.pool.query(sql, params);
      return {
        data: rows,
      };
    } catch (error) {
      console.error(new Error(`Failed to fetch paginated jobs: ${error}`));
    }
  }
}

module.exports = new FailedJobsModel();