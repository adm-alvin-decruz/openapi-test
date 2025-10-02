// failedJobsSupportService.js
const failedJobsModel = require('../../db/models/failedJobsModel');
const galaxyWPService = require('../components/galaxy/services/galaxyWPService');
const userDBService = require('../users/usersDBService');
const { getCurrentUTCTimestamp, convertDateToMySQLFormat } = require('../../utils/dateUtils');
const escape = require('escape-html');

class FailedJobsSupportService {
  constructor() {
    this.allowedFields = [
      'id',
      'uuid',
      'name',
      'action',
      'data',
      'source',
      'triggered_at',
      'status',
      'created_at',
      'updated_at',
    ];
    this.tableName = 'failed_jobs';
  }
  /**
   * Default pagination values
   */
  static DEFAULT_PAGE_SIZE = 100;
  static DEFAULT_PAGE = 1;
  // static allowedFields = ["id","uuid","name","action","data","source","triggered_at","status","created_at","updated_at"];

  /**
   * Status mapping for validation
   */
  static STATUS_MAP = {
    NEW: 0,
    RETRIGGERED: 1,
    SUCCESS: 2,
    FAILED: 3,
  };

  /**
   * Source mapping for reference
   */
  static SOURCE_MAP = {
    SQS: 1,
    CIAM_MAIN: 2,
    PASSKIT: 3,
  };

  // dynamic function caller using string method name
  async execute(methodName, ...args) {
    if (typeof this[methodName] === 'function') {
      return this[methodName](...args);
    }
    throw new Error(`Method ${methodName} not found`);
  }

  /**
   * Retrieve failed jobs with pagination and filters
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.pageSize - Items per page (default: 10)
   * @param {number} options.status - Filter by status
   * @param {number} options.source - Filter by source
   * @param {string} options.name - Filter by job name
   * @param {string} options.action - Filter by action
   * @param {string} options.startDate - Filter by date range start
   * @param {string} options.endDate - Filter by date range end
   * @returns {Promise<Object>} Paginated results with metadata
   */
  async getFailedJobsWithPagination(options = {}) {
    try {
      const {
        page = page ? page : FailedJobsSupportService.DEFAULT_PAGE,
        pageSize = FailedJobsSupportService.DEFAULT_PAGE_SIZE,
        limit,
        status,
        source,
        startDate,
        endDate,
        search = sanitizedSearch(search),
        fields = ['*'],
        sortBy = 'created_at',
        sortOrder = 'DESC',
      } = options.body;

      const sanitizedSearch = {
        name: this.sanitizeSearchTerm(search.name),
        action: this.sanitizeSearchTerm(search.action),
        uuid: this.sanitizeSearchTerm(search.uuid),
      };

      // Validate and sanitize field selection
      const selectedFields = this.validateFields(fields);

      const offset = (page - 1) * limit;
      const conditions = [];
      const params = [];

      // Build WHERE conditions
      if (status !== null) {
        conditions.push('status = ?');
        params.push(status);
      }

      if (source !== null) {
        conditions.push('source = ?');
        params.push(source);
      }

      if (startDate) {
        conditions.push('created_at >= ?');
        params.push(startDate);
      }

      if (endDate) {
        conditions.push('created_at <= ?');
        params.push(endDate);
      }

      // Enhanced search conditions
      if (search.name) {
        const nameTerms = search.name.split(',').map((term) => term.trim());
        if (nameTerms.length > 0) {
          const nameConditions = nameTerms.map(() => 'name LIKE ?').join(' OR ');
          conditions.push(`(${nameConditions})`);
          nameTerms.forEach((term) => params.push(`%${term}%`));
        }
      }

      if (search.action) {
        const actionTerms = search.action.split(',').map((term) => term.trim());
        if (actionTerms.length > 0) {
          const actionConditions = actionTerms.map(() => 'action LIKE ?').join(' OR ');
          conditions.push(`(${actionConditions})`);
          actionTerms.forEach((term) => params.push(`%${term}%`));
        }
      }

      if (search.uuid) {
        // For UUID, we can support exact match or partial match
        const uuidTerms = search.uuid.split(',').map((term) => term.trim());
        if (uuidTerms.length > 0) {
          const uuidConditions = uuidTerms.map((term) => {
            // If the term is a complete UUID (36 characters)
            if (term.length === 36) {
              conditions.push('uuid = ?');
              params.push(term);
            } else {
              conditions.push('uuid LIKE ?');
              params.push(`%${term}%`);
            }
          });
        }
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM ${this.tableName}
        ${whereClause}
      `;
      const countResult = await failedJobsModel.query(countQuery, params);
      const totalCount = countResult.data[0].total;

      // Get paginated data with selected fields
      const dataQuery = `
        SELECT ${selectedFields.join(', ')}
        FROM ${this.tableName}
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;
      const rows = await failedJobsModel.query(dataQuery, [...params, limit, offset]);

      return {
        data: rows,
        pagination: {
          total: totalCount,
          page: page,
          limit: limit,
          totalPages: Math.ceil(totalCount / limit),
        },
        query: {
          fields: selectedFields,
          sortBy,
          sortOrder,
        },
      };
    } catch (error) {
      console.error(new Error(`[CIAM-SUPPORT] Failed to retrieve failed jobs: ${error}`));
    }
  }

  async receivedTriggerReq(req) {
    // find failed job by uuid
    let failedJob = await failedJobsModel.findByUuid(req.body.uuid);
    if (!failedJob) {
      console.log(new Error('Failed job not found in DB'));
    }

    let retrigger = await this.retriggerByType(req, failedJob);

    if (retrigger) {
      return {
        message: `Successfully retriggered failed job: ${escape(req.body.uuid)}`,
        data: retrigger,
        status: 'success',
      };
    } else {
      return {
        message: `Failed to retrigger failed job: ${escape(req.body.uuid)}`,
        data: failedJob,
        status: 'failed',
      };
    }
  }

  /**  trigger failed job by type */
  async retriggerByType(req, failedJob) {
    // alter req payload with DB data
    failedJob.processTimer = req.processTimer;
    req.body = failedJob.data.body;

    if (failedJob.name === 'GalaxyWPService' && failedJob.action === 'callMembershipPassApi') {
      // push to queue for Galaxy Import Pass
      const galaxySQS = await galaxyWPService.galaxyToSQS(req, failedJob.data.action);

      // user migration - update user_migrations table for signup & sqs status
      let dbUpdate;
      if (galaxySQS.$metadata.httpStatusCode === 200) {
        if (failedJob.data.body.migrations) {
          // update user migration table
          dbUpdate = await userDBService.updateUserMigration(req, 'signup', 'signupSQS');
        }
        // update failed job status
        dbUpdate = await this.updateJobStatus(
          failedJob.id,
          FailedJobsSupportService.STATUS_MAP.RETRIGGERED,
        );
      }
      return dbUpdate;
    }
    console.log(
      new Error(
        `[supportFailedJobsService] Failed job name: ${failedJob.name} and failed job action: ${failedJob.action} not supported`,
      ),
    );
    return false;
  }

  /**
   * Update job status with support notes
   * @param {number} id - Job ID
   * @param {number} status - New status
   * @param {Object} supportNotes - Support notes and metadata
   * @returns {Promise<Object>} Updated job
   */
  async updateJobStatus(id, status, supportNotes = {}) {
    try {
      // Validate status
      if (!Object.values(FailedJobsSupportService.STATUS_MAP).includes(status)) {
        console.error(new Error('Invalid status value'));
      }

      const job = await failedJobsModel.findById(id);
      if (!job) {
        console.error(new Error('Job not found'));
      }

      const allowedFields = ['status', 'triggered_at'];

      let updateData = {
        status: status,
        triggered_at: getCurrentUTCTimestamp(),
      };

      const updates = [];
      const values = [];

      Object.entries(updateData).forEach(([key, value]) => {
        if (allowedFields.includes(key)) {
          updates.push(`${key} = ?`);
          values.push(key === 'status' ? value : value);
        }
      });

      updateData = { updates: updates, values: values };

      // Update job
      await failedJobsModel.update(id, updateData);

      return await failedJobsModel.findById(id);
    } catch (error) {
      console.error(new Error(`Failed to update job status: ${error}`));
    }
  }

  /**
   * Soft delete job after support completion
   * @param {number} id - Job ID
   * @param {Object} metadata - Deletion metadata
   * @returns {Promise<boolean>} Success status
   */
  async markJobAsResolved(id, metadata = {}) {
    try {
      const job = await failedJobsModel.findById(id);
      if (!job) {
        throw new Error('Job not found');
      }

      // Add resolution metadata before deletion
      const currentData = job.data || {};
      const updatedData = {
        ...currentData,
        resolution: {
          timestamp: new Date().toISOString(),
          resolvedBy: metadata.resolvedBy || 'support_system',
          notes: metadata.notes || '',
          reason: metadata.reason || 'Support completed',
        },
      };

      // Update the job one last time before deletion
      await failedJobsModel.update(id, {
        status: FailedJobsSupportService.STATUS_MAP.SUCCESS,
        data: updatedData,
      });

      // Soft delete by moving to archive table or marking as deleted
      // This implementation depends on your archiving strategy
      const query = `
        INSERT INTO failed_jobs_archive
        SELECT *, NOW() as archived_at
        FROM failed_jobs
        WHERE id = ?
      `;

      await failedJobsModel.query(query, [id]);
      await failedJobsModel.delete(id);

      return true;
    } catch (error) {
      console.error(new Error(`Failed to mark job as resolved: ${error}`));
    }
  }

  /**
   * Get support statistics
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Support statistics
   */
  async getSupportStatistics(options = {}) {
    try {
      const query = `
        SELECT
          COUNT(*) as total_jobs,
          SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as failed_jobs,
          SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as resolved_jobs,
          SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as retriggered_jobs,
          source,
          DATE(created_at) as date
        FROM failed_jobs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY source, DATE(created_at)
        ORDER BY date DESC
      `;

      const [results] = await failedJobsModel.query(query);
      return results;
    } catch (error) {
      console.error(new Error(`Failed to get support statistics: ${error}`));
    }
  }

  /**
   * Validate and sanitize field selection
   * @param {Array<string>} fields - Array of field names to validate
   * @returns {Array<string>} Sanitized field array
   */
  validateFields(fields) {
    try {
      if (!fields || !Array.isArray(fields) || fields.length === 0) {
        return ['*'];
      }

      // Check if this.allowedFields is defined and is an array
      if (!Array.isArray(this.allowedFields)) {
        console.warn(
          '[CIAM-SUPPORT] FailedJobsSupportService.validateFields: allowedFields is not properly initialized',
        );
        return ['*'];
      }

      const sanitizedFields = fields.filter((field) => this.allowedFields.includes(field));

      return sanitizedFields.length > 0 ? sanitizedFields : ['*'];
    } catch (error) {
      console.error(
        new Error(
          `[CIAM-SUPPORT] FailedJobsSupportService.validateFields Failed to validate fields: ${error}`,
        ),
      );
      return ['*']; // Return a default value in case of error
    }
  }

  /**
   * Sanitize search terms
   * @private
   */
  sanitizeSearchTerm(term) {
    if (!term) return null;
    // Remove dangerous SQL characters and trim whitespace
    return term.replace(/[;'"\\%_]/g, '').trim();
  }
}

module.exports = new FailedJobsSupportService();
