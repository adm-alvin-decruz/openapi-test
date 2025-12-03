const { getDataSource } = require('../../db/typeorm/data-source');
const loggerService = require('../../logs/logger');
const userConfig = require('../../config/usersConfig');

/**
 * Service layer cho GET /private/v1/users
 * Xử lý business logic, validation, format response
 * Dùng TypeORM repository trực tiếp (không cần custom repository class)
 */
class UsersV2Service {
  /**
   * Get users với filters, pagination, sorting
   * 
   * @param {Object} req - Express request object
   * @returns {Promise<Object>} Response object
   */
  static async getUsers(req) {
    try {
      // Parse và validate query parameters
      const filters = this._parseFilters(req.query);
      const pagination = this._parsePagination(req.query);
      const sorting = this._parseSorting(req.query);

      // Get TypeORM repository trực tiếp
      const dataSource = await getDataSource();
      const userRepository = dataSource.getRepository('User');

      // Build query builder
      const queryBuilder = userRepository.createQueryBuilder('user');

      // Apply filters
      if (filters.email) {
        // Support both exact match và LIKE search
        if (filters.email.includes('%') || filters.email.includes('_')) {
          queryBuilder.andWhere('user.email LIKE :email', { email: filters.email });
        } else {
          queryBuilder.andWhere('user.email = :email', { email: filters.email });
        }
      }

      if (filters.mandai_id) {
        queryBuilder.andWhere('user.mandai_id = :mandai_id', { mandai_id: filters.mandai_id });
      }

      if (filters.singpass_uuid) {
        queryBuilder.andWhere('user.singpass_uuid = :singpass_uuid', { singpass_uuid: filters.singpass_uuid });
      }

      if (filters.status !== undefined && filters.status !== null) {
        queryBuilder.andWhere('user.status = :status', { status: filters.status });
      }

      if (filters.created_from) {
        queryBuilder.andWhere('user.created_at >= :created_from', { created_from: filters.created_from });
      }

      if (filters.created_to) {
        queryBuilder.andWhere('user.created_at <= :created_to', { created_to: filters.created_to });
      }

      // Exclude soft-deleted records
      queryBuilder.andWhere('user.delete_at IS NULL');

      // Apply sorting
      const sortBy = sorting.sort_by || 'created_at';
      const sortOrder = (sorting.sort_order || 'DESC').toUpperCase();
      const allowedSortFields = ['id', 'email', 'mandai_id', 'singpass_uuid', 'status', 'created_at', 'updated_at'];
      
      if (allowedSortFields.includes(sortBy)) {
        queryBuilder.orderBy(`user.${sortBy}`, sortOrder);
      } else {
        // Default fallback
        queryBuilder.orderBy('user.created_at', 'DESC');
      }

      // Get total count (before pagination)
      const total = await queryBuilder.getCount();

      // Apply pagination
      const page = Math.max(1, parseInt(pagination.page) || 1);
      const limit = Math.min(250, Math.max(1, parseInt(pagination.limit) || 50)); // Max 250, default 50
      const skip = (page - 1) * limit;

      queryBuilder.skip(skip).take(limit);

      // Execute query
      const users = await queryBuilder.getMany();

      // Format result
      const result = {
        users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };

      // Format response
      return {
        status: 'success',
        statusCode: 200,
        membership: {
          code: 200,
          mwgCode: 'MWG_CIAM_USERS_GET_SUCCESS',
          message: 'Get users successfully.',
        },
        data: {
          users: result.users.map(user => this._formatUserResponse(user)),
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
   * Parse filters từ query string
   * 
   * @param {Object} query - req.query
   * @returns {Object} Filters object
   */
  static _parseFilters(query) {
    const filters = {};

    if (query.email) {
      filters.email = query.email.trim();
    }

    if (query.mandai_id) {
      filters.mandai_id = query.mandai_id.trim();
    }

    if (query.singpass_uuid) {
      filters.singpass_uuid = query.singpass_uuid.trim();
    }

    if (query.status !== undefined && query.status !== null) {
      const status = parseInt(query.status);
      if ([0, 1].includes(status)) {
        filters.status = status;
      }
    }

    if (query.created_from) {
      // Validate ISO date format
      const date = new Date(query.created_from);
      if (!isNaN(date.getTime())) {
        filters.created_from = date.toISOString();
      }
    }

    if (query.created_to) {
      const date = new Date(query.created_to);
      if (!isNaN(date.getTime())) {
        filters.created_to = date.toISOString();
      }
    }

    return filters;
  }

  /**
   * Parse pagination từ query string
   * 
   * @param {Object} query - req.query
   * @returns {Object} Pagination object
   */
  static _parsePagination(query) {
    return {
      page: parseInt(query.page) || 1,
      limit: Math.min(
        parseInt(query.limit) || 50,
        userConfig.DEFAULT_PAGE_SIZE || 250
      ),
    };
  }

  /**
   * Parse sorting từ query string
   * 
   * @param {Object} query - req.query
   * @returns {Object} Sorting object
   */
  static _parseSorting(query) {
    return {
      sort_by: query.sort_by || 'created_at',
      sort_order: (query.sort_order || 'DESC').toUpperCase(),
    };
  }

  /**
   * Format user object cho response
   * Chỉ trả về các field cần thiết, không expose sensitive data
   * 
   * @param {Object} user - User entity từ database
   * @returns {Object} Formatted user object
   */
  static _formatUserResponse(user) {
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

module.exports = UsersV2Service;

