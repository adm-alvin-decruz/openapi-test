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

    let joins = [];
    let relatedFieldMappings = {};

    // Check if any membership-related fields are in query
    // Note: Express qs parser converts field[operator]=value into nested objects
    // e.g., membershipDetails.validUntil[gt]=value becomes { "membershipDetails.validUntil": { gt: 'value' } }
    // The dot is kept in the key name, not as nested object structure
    
    // Helper function to check if a query key matches membership pattern
    const hasMembershipKey = (key) => {
      return key && (
        key.startsWith('membershipDetails.') ||
        key === 'categoryType' ||
        key === 'validFrom' ||
        key === 'validUntil' ||
        key.includes('validFrom') ||
        key.includes('validUntil')
      );
    };
    
    // Check all query keys for membership-related fields
    const hasMembershipDetailsFilter = 
      // Simple fields (without membershipDetails prefix)
      (req.query.categoryType && req.query.categoryType.trim() !== '') ||
      (req.query.validFrom && req.query.validFrom.trim() !== '') ||
      (req.query.validUntil && req.query.validUntil.trim() !== '') ||
      // Check all query keys for membership-related patterns
      Object.keys(req.query || {}).some(key => {
        if (!hasMembershipKey(key)) return false;
        
        const value = req.query[key];
        // Check if it's a nested object (from qs parser with operators)
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return Object.keys(value).length > 0;
        }
        // Check if it's a string value
        if (typeof value === 'string' && value.trim() !== '') {
          return true;
        }
        return false;
      }) ||
      // Fields without prefix but related to membership
      req.query.validFromIsNull ||
      req.query.validUntilIsNull ||
      req.query.validFromNotNull ||
      req.query.validUntilNotNull ||
      req.query.validFromFrom ||
      req.query.validFromTo ||
      req.query.validUntilFrom ||
      req.query.validUntilTo;

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
          'mandaiIdIsNull',
          'mandaiIdNotNull',
          'singpassId',
          'singpassIdIsNull',
          'singpassIdNotNull',
          'createdAt',
          'createdAtFrom',
    ];

    // Only add membership-related fields to allowedFields if join is added
    if (joins.length > 0) {
      allowedFields.push(
        'validFrom',
        'validUntil',
        'categoryType',
        'validFromIsNull',
        'validUntilIsNull',
        'validFromNotNull',
        'validUntilNotNull',
        'validFromFrom',
        'validFromTo',
        'validUntilFrom',
        'validUntilTo',
        'membershipDetails.validUntil[lte]',
        'membershipDetails.validFrom[gte]',
        'membershipDetails.categoryType',
        'membershipDetails.validUntil[gt]',
        'membershipDetails.validUntil[lt]',
        'membershipDetails.validFromIsNull',
        'membershipDetails.validUntilIsNull',
        'membershipDetails.validFromNotNull',
        'membershipDetails.validUntilNotNull',
        'membershipDetails.validFromFrom',
        'membershipDetails.validFromTo',
        'membershipDetails.validUntilFrom',
        'membershipDetails.validUntilTo',
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

