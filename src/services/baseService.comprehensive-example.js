/**
 * Comprehensive Example - Tất cả các trường hợp filter mà BaseService support
 * 
 * File này minh họa đầy đủ các tính năng của BaseService với ví dụ thực tế
 */

const BaseService = require('./baseService');
const loggerService = require('../logs/logger');

class UsersService extends BaseService {
  constructor() {
    super('User'); // Entity name
  }

  /**
   * Ví dụ đầy đủ với TẤT CẢ các loại filter
   * 
   * Query example với tất cả các trường hợp:
   * GET /users?
   *   email=test@example.com&                    // 1. Exact match
   *   email=test%&                               // 2. LIKE match (contains 'test')
   *   status=1&                                  // 3. Exact match (number)
   *   status_in=1,2,3&                          // 4. IN operator (multiple values)
   *   created_from=2024-01-01&                  // 5. Range filter (FROM)
   *   created_to=2024-12-31&                    // 6. Range filter (TO)
   *   email_not_null=true&                      // 7. NOT NULL check
   *   phone_number_not_null=true&               // 8. NOT NULL trên related table
   *   deleted_at_is_null=true&                  // 9. IS NULL check
   *   phone_number=1234567890&                  // 10. Filter trên related table (exact)
   *   country=SG&                                // 11. Filter trên related table với field mapping
   *   membership_name=wildpass&                 // 12. Filter trên related table khác
   *   page=2&                                    // 13. Pagination
   *   limit=20&                                 // 14. Pagination limit
   *   sort_by=created_at&                       // 15. Sorting
   *   sort_order=DESC                           // 16. Sort order
   */
  async getUsersComprehensive(req) {
    try {
      const options = {
        // ============================================
        // 1. ALLOWED FIELDS - Security whitelist
        // ============================================
        // Chỉ cho phép filter trên các fields này
        // Ngăn chặn SQL injection qua field names
        allowedFields: [
          // Main entity fields
          'email',
          'mandai_id',
          'singpass_uuid',
          'status',
          'source',
          'created_at',
          'updated_at',
          'delete_at',
          // Related table fields (phải có trong relatedFieldMappings)
          'phone_number',      // từ user_details
          'country',           // từ user_details (mapped từ zoneinfo)
          'address',           // từ user_details
          'membership_name',   // từ user_memberships
          'membership_visual_id', // từ user_memberships
        ],

        // ============================================
        // 2. FIELD MAPPINGS - Map API fields to DB fields
        // ============================================
        // Cho phép API dùng tên field khác với DB
        fieldMappings: {
          // Ví dụ: API dùng 'user_email' nhưng DB field là 'email'
          // user_email: 'email',
        },

        // ============================================
        // 3. RELATED FIELD MAPPINGS - Map related table fields
        // ============================================
        // Map query parameter → related table alias + field
        relatedFieldMappings: {
          // Format: 'queryParam': { alias: 'joinAlias', field: 'tableField' }
          'phone_number': { 
            alias: 'userDetails', 
            field: 'phone_number' 
          },
          'country': { 
            alias: 'userDetails', 
            field: 'zoneinfo'  // DB field là 'zoneinfo' nhưng API dùng 'country'
          },
          'address': { 
            alias: 'userDetails', 
            field: 'address' 
          },
          'membership_name': { 
            alias: 'memberships', 
            field: 'name' 
          },
          'membership_visual_id': { 
            alias: 'memberships', 
            field: 'visual_id' 
          },
        },

        // ============================================
        // 4. JOINS - Configure table joins
        // ============================================
        // leftJoinAndSelect: Join + Select (tránh N+1)
        // leftJoin: Chỉ join để filter (cần selectFields nếu muốn data)
        joins: [
          {
            type: 'leftJoinAndSelect', // ✅ Tránh N+1 - tự động select tất cả fields
            entity: 'user_details',    // Tên bảng hoặc entity name
            alias: 'userDetails',      // Alias để dùng trong query
            condition: 'user.id = userDetails.user_id', // Điều kiện join
            // Hoặc dùng foreignKey để auto-generate:
            // foreignKey: 'user_id'
          },
          {
            type: 'leftJoinAndSelect', // ✅ Tránh N+1
            entity: 'user_memberships',
            alias: 'memberships',
            condition: 'user.id = memberships.user_id',
          },
        ],

        // ============================================
        // 5. DEFAULT FILTERS - Always applied
        // ============================================
        // Các filter luôn được apply (ví dụ: soft delete)
        defaultFilters: {
          delete_at_is_null: true, // Luôn filter ra các record đã bị soft delete
        },

        // ============================================
        // 6. PAGINATION OPTIONS
        // ============================================
        defaultPage: 1,
        defaultLimit: 50,
        maxLimit: 250, // Giới hạn tối đa để tránh query quá lớn

        // ============================================
        // 7. SORTING OPTIONS
        // ============================================
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

      // ============================================
      // EXECUTION FLOW
      // ============================================
      
      // Step 1: Build query với filters, pagination, sorting
      const { queryBuilder, pagination } = await this.buildQuery(req, options);

      // Step 2: Execute query
      const result = await this.executeQuery(queryBuilder, pagination);

      // Step 3: Format response
      return this.formatResponse(result, (user) => this.formatUserResponse(user));
    } catch (error) {
      loggerService.error('UsersService.getUsersComprehensive', error);
      throw error;
    }
  }

  /**
   * Format user response với related data
   */
  formatUserResponse(user) {
    return {
      // Main entity fields
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
      
      // Related data (từ leftJoinAndSelect - không N+1)
      user_details: user.userDetails ? {
        phone_number: user.userDetails.phone_number,
        country: user.userDetails.zoneinfo,
        address: user.userDetails.address,
      } : null,
      
      // Related data (có thể là array nếu one-to-many)
      memberships: user.memberships ? (
        Array.isArray(user.memberships) 
          ? user.memberships.map(m => ({
              name: m.name,
              visual_id: m.visual_id,
              expires_at: m.expires_at ? new Date(m.expires_at).toISOString() : null,
            }))
          : [{
              name: user.memberships.name,
              visual_id: user.memberships.visual_id,
              expires_at: user.memberships.expires_at ? new Date(user.memberships.expires_at).toISOString() : null,
            }]
      ) : [],
    };
  }
}

module.exports = new UsersService();

