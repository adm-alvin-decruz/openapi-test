class BaseDTO {

  DATE_FIELDS = ['created_at', 'updated_at'];
  HIDDEN_FIELDS = ['password_hash'];

  constructor(entity) {
    this.entity = entity;
    this.fromEntity();
  }

  fromEntity() {
    const dateFields = this.DATE_FIELDS || [];
    const hiddenFields = this.HIDDEN_FIELDS || [];
    
    for (const field in this.entity) {
      // Only skip null and undefined, not 0, false, or empty string
      if (this.entity[field] === null || this.entity[field] === undefined) {
        continue;
      }
      
      if (dateFields.includes(field) && this.entity[field] !== null) {
        this[field] = new Date(this.entity[field]).toISOString();
      } else if (hiddenFields.includes(field)) {
        this[field] = '********';
      } else {
        this[field] = this.entity[field];
      }
    }
  }

  /**
   * Convert DTO to plain JSON object
   * JSON.stringify will automatically call this method
   * Excludes internal fields (DATE_FIELDS, HIDDEN_FIELDS, entity) from output
   * @returns {Object} Plain object without internal fields
   */
  toJSON() {
    const json = {};
    const internalFields = ['DATE_FIELDS', 'HIDDEN_FIELDS', 'entity'];
    
    for (const key in this) {
      // Only skip null, undefined, and internal fields
      // Include 0, false, and empty string as valid values
      if (this[key] !== null && this[key] !== undefined && !internalFields.includes(key)) {
        json[key] = this[key];
      }
    }

    return json;
  }
}

module.exports = BaseDTO;