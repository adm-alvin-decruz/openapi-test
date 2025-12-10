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

    let allowedFields = [
          'email',
          'status',
          'mandaiId',
          'mandaiIdIsNull',
          'singpassId',
          'createdAt',
          'createdAtFrom',
    ];

    if (req.query.categoryType) {
      joins.push({
        type: 'leftJoin',
        entity: 'user_membership_details',
        alias: 'membershipDetails',
        condition: 'user.id = membershipDetails.user_id',
        selectFields: ['id', 'user_id', 'category_type'],
      });

      relatedFieldMappings['categoryType'] = {
        alias: 'membershipDetails',
        field: 'category_type',
      };

      allowedFields.push('categoryType');
    }

    try {
      const options = {
        allowedFields: allowedFields,

        joins: joins,

        relatedFieldMappings: relatedFieldMappings,

        defaultPage: 1,
        defaultLimit: 50,
        maxLimit: appConfig.DEFAULT_PAGE_SIZE || 250,

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
          'createdAtTo',
          'createdAtFrom',
          'updatedAtFrom',
          'updatedAtTo',
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
      loggerService.error('UsersV2Service.getUsers', error);
      throw error;
    }
  }
}

module.exports = { 
  UsersServicesV2: new UsersServicesV2(),
};

