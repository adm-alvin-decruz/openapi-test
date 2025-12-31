const BaseService = require('../../services/baseService');
const loggerService = require('../../logs/logger');
const appConfigService = require('../../services/appConfigService');
const UserDTO = require('../dtos/UserDTO');

/**
 * UsersServicesV2 - Service for User entity operations
 * Extends BaseService to leverage dynamic filters, pagination, and sorting
 */
class UsersServicesV2 extends BaseService {
  constructor() {
    super('User'); // Initialize BaseService with 'User' entity
  }

  /**
   * Override parseSorting to correctly handle camelCase sortBy parameter
   * Convention: Query parameters must always be camelCase. If user sends snake_case, it's invalid.
   *
   * 1. Support both sortBy (camelCase) and sort_by (snake_case) parameter names for backward compatibility
   * 2. Validate that sortBy value is camelCase (reject snake_case values)
   * 3. Validate against allowedSortFields (which are camelCase)
   * 4. Convert to snake_case for database query
   *
   * @param {Object} query - Query object with sortBy/sort_by and sortOrder/sort_order
   * @param {Object} options - Options with defaultSortBy, defaultSortOrder, allowedSortFields
   * @returns {Object} Sorting object with sort_by (snake_case) and sort_order
   */
  parseSorting(query, options = {}) {
    const {
      defaultSortBy = 'createdAt',
      defaultSortOrder = 'DESC',
      allowedSortFields = [],
      fieldMappings = {},
    } = options;

    // Support both sortBy (camelCase) and sort_by (snake_case) parameter names for backward compatibility
    const sortByQueryRaw = query.sortBy || query.sort_by;
    const sortOrderQueryRaw = query.sortOrder || query.sort_order;

    const sortByQuery = typeof sortByQueryRaw === 'string' ? sortByQueryRaw : defaultSortBy;
    const sortOrderQuery = (
      typeof sortOrderQueryRaw === 'string' ? sortOrderQueryRaw : defaultSortOrder
    ).toUpperCase();

    // Convention: Query parameter values must be camelCase
    // If user sends snake_case value (contains underscore), reject it and use default
    if (typeof sortByQuery !== 'string' || sortByQuery.includes('_')) {
      // Invalid: non-string or snake_case value provided, fallback to default
      const dbSortBy = fieldMappings[defaultSortBy] || this.camelToSnakeCase(defaultSortBy);
      return {
        sort_by: dbSortBy,
        sort_order: sortOrderQuery === 'ASC' ? 'ASC' : 'DESC',
      };
    }

    // Validate against allowed fields (which are camelCase)
    const validatedSortBy = allowedSortFields.includes(sortByQuery) ? sortByQuery : defaultSortBy;

    // Map to snake_case for the database query. Use fieldMappings if available, otherwise convert.
    const dbSortBy = fieldMappings[validatedSortBy] || this.camelToSnakeCase(validatedSortBy);

    return {
      sort_by: dbSortBy,
      sort_order: sortOrderQuery === 'ASC' ? 'ASC' : 'DESC',
    };
  }

  /**
   * Get users with filters, pagination, and sorting
   *
   * @param {Object} req - Request object with query parameters
   * @returns {Promise<Object>} Formatted response with users and pagination
   */
  async getUsers(req) {
    let joins = [];
    let relatedFieldMappings = {};

    // Check if any membership-related fields are in query
    // Note: Express qs parser converts field[operator]=value into nested objects
    // e.g., membershipDetails.validUntil[gt]=value becomes { membershipDetails: { validUntil: { gt: 'value' } } }

    // Helper function to check if query contains membership-related fields
    const hasMembershipKey = (query) => {
      if (!query || typeof query !== 'object') {
        return false;
      }

      // Check for nested membershipDetails object (from Express qs parser)
      // Query: membershipDetails.categoryType[eq]=value
      // Parsed: { membershipDetails: { categoryType: { eq: 'value' } } }
      if (query.membershipDetails && typeof query.membershipDetails === 'object') {
        const keys = Object.keys(query.membershipDetails);
        if (keys.length > 0) {
          // Check if any of the keys are membership-related fields
          const membershipFields = [
            'categoryType',
            'validFrom',
            'validUntil',
            'category_type',
            'valid_from',
            'valid_until',
          ];
          // If any key matches membership fields, or if we have nested objects (which means it's a related field)
          return keys.some((key) => {
            const fieldValue = query.membershipDetails[key];
            // Check if it's a membership field name OR if it's an object (which means it's a field with operators)
            return membershipFields.includes(key) || (fieldValue && typeof fieldValue === 'object');
          });
        }
      }

      // Check for direct membership fields (validFrom, validUntil, categoryType)
      // These might be used without the membershipDetails prefix
      return !!(query.categoryType || query.validFrom || query.validUntil);
    };

    // Check if membership-related fields are present in query
    const hasMembershipDetailsFilter = hasMembershipKey(req.query || {});

    // Only add join if membership-related fields are requested
    if (hasMembershipDetailsFilter) {
      joins.push({
        type: 'leftJoin',
        entity: 'user_membership_details',
        alias: 'membershipDetails',
        condition: 'user.id = membershipDetails.user_id',
        selectFields: ['id', 'user_id', 'category_type', 'valid_from', 'valid_until'],
      });

      relatedFieldMappings = {
        validFrom: {
          alias: 'membershipDetails',
          field: 'valid_from',
        },
        validUntil: {
          alias: 'membershipDetails',
          field: 'valid_until',
        },
        categoryType: {
          alias: 'membershipDetails',
          field: 'category_type',
        },
      };
    }

    // Get base allowed fields from DTO
    let allowedFields = UserDTO.getAllowedFields();

    // Only add membership-related fields to allowedFields if join is added
    if (joins.length > 0) {
      allowedFields.push(...UserDTO.getMembershipFields());
    }

    try {
      const options = {
        allowedFields: allowedFields,

        joins: joins,

        relatedFieldMappings: relatedFieldMappings,

        defaultPage: appConfigService.get('DEFAULT_PAGE') || 1,
        defaultLimit: appConfigService.get('DEFAULT_LIMIT') || 50,
        maxLimit: appConfigService.get('MAX_LIMIT') || 250,

        // Sorting configuration from DTO
        ...UserDTO.getDefaultSortConfig(),
        allowedSortFields: UserDTO.getAllowedSortFields(),
      };

      const {
        queryBuilder,
        pagination,
        options: buildOptions,
      } = await this.buildQuery(req, options);

      const result = await this.executeQuery(queryBuilder, pagination, buildOptions);

      return {
        status: 'success',
        statusCode: 200,
        membership: {
          code: 200,
          mwgCode: 'MWG_CIAM_USERS_GET_SUCCESS',
          message: 'Get users successfully.',
        },
        data: {
          users: result.data.map((user) => new UserDTO(user).toJSON()),
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages,
          },
        },
      };
    } catch (error) {
      console.error('Error in UsersV2Service.getUsers:', error);
      loggerService.error('UsersV2Service.getUsers', { error: error.message });
      throw error;
    }
  }
}

module.exports = {
  UsersServicesV2: new UsersServicesV2(),
};
