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
   * camelCase normalization is now handled by baseService via normalizeCamelCase option
   * 
   * @param {Object} query - Query parameters from request (camelCase)
   * @param {Object} options - Configuration options
   * @returns {Object} Parsed filters object
   */
  parseFilters(query, options = {}) {
    // Enable camelCase normalization in baseService
    const optionsWithNormalization = {
      ...options,
      normalizeCamelCase: true,
    };
    
    // Call parent parseFilters with normalization enabled
    const filters = super.parseFilters(query, optionsWithNormalization);

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
   * Override parseSorting to support camelCase sortBy field
   * 
   * @param {Object} query - Query parameters from request
   * @param {Object} options - Configuration options
   * @returns {Object} Sorting object with sort_by and sort_order
   */
  parseSorting(query, options = {}) {
    // Call parent parseSorting first
    const sorting = super.parseSorting(query, options);
    
    
    return sorting;
  }

  /**
   * Get users with filters, pagination, and sorting
   * 
   * @param {Object} req - Request object with query parameters
   * @returns {Promise<Object>} Formatted response with users and pagination
   */
  async getUsers(req) {
    try {
      const query = req.query || {};
      
      // Define all possible joins (conditional) with their field mappings
      // Note: Using table names directly since TypeORM entities may not exist for these tables
      const allPossibleJoins = [
        {
          type: 'leftJoin',
          entity: 'user_memberships',
          alias: 'memberships',
          condition: 'user.id = memberships.user_id',
          requiredFields: ['categoryType'], // Only join if these fields are in query
          selectFields: ['id', 'user_id'], // Only select needed fields to avoid N+1
        },
        {
          type: 'leftJoin',
          entity: 'user_membership_details',
          alias: 'membershipDetails',
          condition: 'memberships.id = membershipDetails.user_membership_id',
          requiredFields: ['categoryType'], // Only join if these fields are in query
          selectFields: ['id', 'user_membership_id', 'category_type'], // Only select needed fields
          // Field mappings for this join's related fields
          fieldMappings: {
            'categoryType': { field: 'category_type' },
          },
        },
      ];

      // Dynamically determine which joins are needed based on query params
      const requiredJoins = allPossibleJoins.filter(join => {
        // Check if any required field is present in query
        return join.requiredFields.some(field => query[field] !== undefined);
      });

      // Build relatedFieldMappings dynamically from required joins
      const relatedFieldMappings = {};
      const relatedAllowedFields = [];
      
      requiredJoins.forEach(join => {
        if (join.fieldMappings) {
          Object.entries(join.fieldMappings).forEach(([queryField, mapping]) => {
            relatedFieldMappings[queryField] = {
              alias: join.alias,
              field: mapping.field,
            };
            relatedAllowedFields.push(queryField);
          });
        }
      });

      const options = {
        // Field mappings: map camelCase query params to snake_case database fields
        fieldMappings: {
          'mandaiId': 'mandai_id',
          'singpassUuid': 'singpass_uuid',
          'createdAt': 'created_at',
          'updatedAt': 'updated_at',
          'createdFrom': 'created_from',
          'createdTo': 'created_to',
        },

        // Related field mappings (built dynamically from required joins)
        relatedFieldMappings,

        // Allowed fields for filtering (security whitelist)
        allowedFields: [
          'email',
          'status',
          'mandaiId',
          'mandaiIdIsNull',
          'singpassUuid',
          'createdAt',
          'updatedAt',
          'createdAtFrom',
          'createdAtTo',
          'updatedAtFrom',
          'updatedAtTo',
          ...relatedAllowedFields, // Dynamically add related fields from joins
        ],

        // Conditional joins - only add if needed
        joins: requiredJoins.map(join => ({
          type: join.type,
          entity: join.entity,
          alias: join.alias,
          condition: join.condition,
          selectFields: join.selectFields, // Include selectFields if present
        })),

        // Default filters (always applied) - will be normalized to snake_case in parseFilters
        defaultFilters: {
          deleteAtIsNull: true, // Always filter out soft-deleted records
        },

        // Pagination options
        defaultPage: 1,
        defaultLimit: 50,
        maxLimit: userConfig.DEFAULT_PAGE_SIZE || 250,

        defaultSortBy: 'createdAt',
        defaultSortOrder: 'DESC',
        allowedSortFields: [
          'id',
          'email',
          'mandaiId',
          'singpassUuid',
          'status',
          'createdAt',
          'updatedAt',
        ],
      };

      const { queryBuilder, pagination } = await this.buildQuery(req, options);

      const result = await this.executeQuery(queryBuilder, pagination);

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

