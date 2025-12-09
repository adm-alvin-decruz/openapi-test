const BaseService = require('../../services/baseService');
const loggerService = require('../../logs/logger');
const userConfig = require('../../config/usersConfig');

/**
 * UsersServicesV2 - Service for User entity operations
 * Extends BaseService to leverage dynamic filters, pagination, and sorting
 */
class UsersServicesV2 extends BaseService {
  constructor() {
    super('User'); // Initialize BaseService with 'User' entity
  }

  /**
   * Override parseFilters to add custom validation for status field
   * 
   * @param {Object} query - Query parameters from request
   * @param {Object} options - Configuration options
   * @returns {Object} Parsed filters object
   */
  parseFilters(query, options = {}) {
    // Call parent parseFilters first
    const filters = super.parseFilters(query, options);

    // Custom validation for status field (must be 0 or 1)
    if (filters.status !== undefined && filters.status !== null) {
      const status = parseInt(filters.status);
      if (![0, 1].includes(status)) {
        // Remove invalid status from filters
        delete filters.status;
      } else {
        // Ensure status is a number
        filters.status = status;
      }
    }

    return filters;
  }

  /**
   * Get users with filters, pagination, and sorting
   * 
   * @param {Object} req - Request object with query parameters
   * @returns {Promise<Object>} Formatted response with users and pagination
   */
  async getUsers(req) {
    try {
      const options = {
        // Allowed fields for filtering (security whitelist)
        allowedFields: [
          'email',
          'mandai_id',
          'singpass_uuid',
          'status',
          'created_at',
          'updated_at',
        ],

        // Default filters (always applied)
        defaultFilters: {
          delete_at_is_null: true, // Always filter out soft-deleted records
        },

        // Pagination options
        defaultPage: 1,
        defaultLimit: 50,
        maxLimit: userConfig.DEFAULT_PAGE_SIZE || 250,

        // Sorting options
        defaultSortBy: 'created_at',
        defaultSortOrder: 'DESC',
        allowedSortFields: [
          'id',
          'email',
          'mandai_id',
          'singpass_uuid',
          'status',
          'created_at',
          'updated_at',
        ],
      };

      // Build query with filters, pagination, and sorting
      const { queryBuilder, pagination } = await this.buildQuery(req, options);

      // Execute query
      const result = await this.executeQuery(queryBuilder, pagination);

      // Format response with custom structure
      return {
        status: 'success',
        statusCode: 200,
        membership: {
          code: 200,
          mwgCode: 'MWG_CIAM_USERS_GET_SUCCESS',
          message: 'Get users successfully.',
        },
        data: {
          users: result.data.map(user => this._formatUserResponse(user)),
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages,
          },
        },
      };
    } catch (error) {
      loggerService.error('UsersV2Service.getUsers', error);
      throw error;
    }
  }

  /**
   * Format user response object
   * 
   * @param {Object} user - User entity from database
   * @returns {Object} Formatted user object
   */
  _formatUserResponse(user) {
    return {
      id: user.id,
      email: user.email,
      given_name: user.given_name,
      family_name: user.family_name,
      birthdate: user.birthdate ? new Date(user.birthdate).toISOString() : null,
      mandai_id: user.mandai_id,
      source: user.source,
      status: user.status,
      singpass_uuid: user.singpass_uuid,
      otp_email_disabled_until: user.otp_email_disabled_until 
        ? new Date(user.otp_email_disabled_until).toISOString() 
        : null,
      created_at: user.created_at ? new Date(user.created_at).toISOString() : null,
      updated_at: user.updated_at ? new Date(user.updated_at).toISOString() : null,
    };
  }
}

module.exports = { 
  UsersServicesV2: new UsersServicesV2(),
};

