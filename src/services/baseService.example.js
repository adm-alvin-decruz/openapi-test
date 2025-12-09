const loggerService = require('../logs/logger');
/**
 * Example usage of BaseService
 * 
 * This file demonstrates how to use BaseService to create a service with dynamic filters
 */

const BaseService = require('./baseService');

class UsersService extends BaseService {
  constructor() {
    super('User'); // Entity name
  }

  /**
   * Get users with dynamic filters
   * 
   * Example queries:
   * - GET /users?email=test@example.com
   * - GET /users?email=test%&status=1
   * - GET /users?created_from=2024-01-01&created_to=2024-12-31
   * - GET /users?status_in=1,2,3
   * - GET /users?email_not_null=true
   * - GET /users?phone_number=1234567890 (filter by related table)
   * - GET /users?page=1&limit=20&sort_by=created_at&sort_order=DESC
   */
  async getUsers(req) {
    try {
      const options = {
        // Allowed fields for filtering
        allowedFields: [
          'email',
          'mandai_id',
          'singpass_uuid',
          'status',
          'source',
          'created_at',
          'updated_at',
          // Related table fields
          'phone_number', // from user_details
          'country', // from user_details (zoneinfo)
          'membership_name', // from user_memberships
        ],
        // Map query field names to entity field names
        fieldMappings: {
          // If query uses 'user_email' but entity field is 'email'
          // user_email: 'email',
        },
        // Map related table fields
        // Format: { 'queryField': { alias: 'joinAlias', field: 'tableField' } }
        relatedFieldMappings: {
          'phone_number': { alias: 'userDetails', field: 'phone_number' },
          'country': { alias: 'userDetails', field: 'zoneinfo' },
          'membership_name': { alias: 'memberships', field: 'name' },
        },
        // Configure joins
        // IMPORTANT: Use 'leftJoinAndSelect' or 'innerJoinAndSelect' to avoid N+1 query problem
        // These will automatically select all fields from joined tables in a single query
        joins: [
          {
            type: 'leftJoinAndSelect', // Use this instead of 'leftJoin' to prevent N+1
            entity: 'user_details', // table name or entity name
            alias: 'userDetails',
            condition: 'user.id = userDetails.user_id',
            // Or use foreignKey for auto-generated condition:
            // foreignKey: 'user_id'
            // Note: leftJoinAndSelect automatically selects all fields, no need for selectFields
          },
          {
            type: 'leftJoinAndSelect', // Use this to load membership data in same query
            entity: 'user_memberships',
            alias: 'memberships',
            condition: 'user.id = memberships.user_id',
          },
          // Alternative: If you only need specific fields (not all), use leftJoin with selectFields:
          // {
          //   type: 'leftJoin',
          //   entity: 'user_details',
          //   alias: 'userDetails',
          //   condition: 'user.id = userDetails.user_id',
          //   selectFields: ['phone_number', 'zoneinfo'], // Only select these fields
          // },
        ],
        // Default filters (always applied)
        defaultFilters: {
          // Always filter out soft-deleted records
          // delete_at_is_null: true,
        },
        // Pagination options
        defaultPage: 1,
        defaultLimit: 50,
        maxLimit: 250,
        // Sorting options
        defaultSortBy: 'created_at',
        defaultSortOrder: 'DESC',
        allowedSortFields: [
          'id',
          'email',
          'mandai_id',
          'status',
          'created_at',
          'updated_at',
        ],
      };

      // Build query with filters, pagination, and sorting
      const { queryBuilder, pagination } = await this.buildQuery(req, options);

      // Execute query
      const result = await this.executeQuery(queryBuilder, pagination);

      // Format response
      return this.formatResponse(result, (user) => this.formatUserResponse(user));
    } catch (error) {
      loggerService.error('UsersService.getUsers', error);
      throw error;
    }
  }

  /**
   * Format user response
   */
  formatUserResponse(user) {
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

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    return await this.findByField('email', email);
  }

  /**
   * Get user by ID
   */
  async getUserById(id) {
    return await this.findById(id);
  }
}

module.exports = new UsersService();

