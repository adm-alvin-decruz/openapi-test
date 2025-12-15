const BaseDTO = require('./BaseDTO');

class UserDTO extends BaseDTO {
  DATE_FIELDS = ['birthdate', 'otp_email_disabled_until', 'created_at', 'updated_at'];
  HIDDEN_FIELDS = ['password_hash'];

  constructor(entity) {
    super(entity);
  }

  /**
   * Get base allowed fields for user queries
   * @returns {Array<string>} Array of allowed field names
   */
  static getAllowedFields() {
    return [
      'email',
      'status',
      'mandaiId',
      'singpassId',
      'createdAt',
    ];
  }

  /**
   * Get membership-related fields (used when joins are added)
   * @returns {Array<string>} Array of membership field names
   */
  static getMembershipFields() {
    return [
      'validFrom',
      'validUntil',
      'categoryType',
      'category_type',
      'valid_from',
      'valid_until',
    ];
  }

  /**
   * Get default sort configuration
   * @returns {Object} Object with defaultSortBy and defaultSortOrder
   */
  static getDefaultSortConfig() {
    return {
      defaultSortBy: 'createdAt', // camelCase, tự động convert
      defaultSortOrder: 'DESC',
    };
  }

  /**
   * Get allowed sort fields
   * @returns {Array<string>} Array of allowed sort field names (camelCase)
   */
  static getAllowedSortFields() {
    return [
      'id',
      'email',
      'mandaiId',
      'singpassId',
      'status',
      'createdAt',
      'updatedAt',
    ];
  }
}

module.exports = UserDTO;