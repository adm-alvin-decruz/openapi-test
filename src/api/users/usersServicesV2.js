const BaseService = require('../../services/baseService');
const loggerService = require('../../logs/logger');
const appConfig = require('../../config/appConfig');
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
   * Get users with filters, pagination, and sorting
   * 
   * @param {Object} req - Request object with query parameters
   * @returns {Promise<Object>} Formatted response with users and pagination
   */
  async getUsers(req) {
    console.log('🔍 Debug - Query:', JSON.stringify(req.query, null, 2));
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
          const membershipFields = ['categoryType', 'validFrom', 'validUntil', 'category_type', 'valid_from', 'valid_until'];
          // If any key matches membership fields, or if we have nested objects (which means it's a related field)
          return keys.some(key => {
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
    
    // Debug: Log query structure for troubleshooting
    if (req.query && (req.query.membershipDetails || req.query.categoryType || req.query.validFrom || req.query.validUntil)) {
      console.log('🔍 Debug - Query structure:', JSON.stringify(req.query, null, 2));
      console.log('🔍 Debug - hasMembershipDetailsFilter:', hasMembershipDetailsFilter);
      console.log('🔍 Debug - Joins will be added:', hasMembershipDetailsFilter);
    }

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
        'validFrom': {
          alias: 'membershipDetails',
          field: 'valid_from',
        },
        'validUntil': {
          alias: 'membershipDetails',
          field: 'valid_until',
        },
        'categoryType': {
          alias: 'membershipDetails',
          field: 'category_type',
        },
      };
    }

    let allowedFields = [
          'email',
          'status',
          'mandaiId',
          'singpassId',
          'createdAt',
    ];

    // Only add membership-related fields to allowedFields if join is added
    if (joins.length > 0) {
      allowedFields.push(
        'validFrom',
        'validUntil',
        'categoryType',
        'category_type',
        'valid_from',
        'valid_until'
      );
    }

    try {
      const options = {
        allowedFields: allowedFields,

        joins: joins,

        relatedFieldMappings: relatedFieldMappings,

        defaultPage: appConfig.DEFAULT_PAGE || 1,
        defaultLimit: appConfig.DEFAULT_LIMIT || 50,
        maxLimit: appConfig.MAX_LIMIT || 250,

        // 6. Sorting
        defaultSortBy: 'createdAt', // camelCase, tự động convert
        defaultSortOrder: 'DESC',
        allowedSortFields: [
          'id',
          'email',
          'mandaiId',
          'singpassId',
          'status',
          'createdAt',
          'updatedAt',
        ],
      };

      const { queryBuilder, pagination, options: buildOptions } = await this.buildQuery(req, options);

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
          users: result.data.map(user => new UserDTO(user).toJSON()),
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

