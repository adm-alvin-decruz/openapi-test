/**
 * Parse a JSON column value from a database query result.
 * Handles cases where the value may be:
 * - null/undefined (returns default)
 * - a string that needs JSON.parse
 * - already parsed object/array
 *
 * @param {*} value - The value from the database column
 * @param {*} defaultValue - Default value to return if value is falsy or parsing fails (default: [])
 * @returns {*} Parsed JSON value or the default value
 */
const parseJsonColumn = (value, defaultValue = []) => {
  if (!value) {
    return defaultValue;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error(`Failed to parse JSON data from database: ${value}`, e);
      return defaultValue;
    }
  }
  return value;
};

module.exports = {
  parseJsonColumn,
};
