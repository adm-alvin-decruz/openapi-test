const { getDataSource } = require('../db/typeorm/data-source');
const userConfig = require('../config/usersConfig');

/**
 * BaseService - Base class for services with dynamic filters, pagination, and sorting
 * 
 * Usage:
 * class MyService extends BaseService {
 *   constructor() {
 *     super('MyEntity');
 *   }
 * 
 *   async getItems(req) {
 *     const queryBuilder = await this.buildQuery(req);
 *     const result = await this.executeQuery(queryBuilder, req);
 *     return this.formatResponse(result, req);
 *   }
 * }
 */
class BaseService {
  constructor(entityName) {
    this.entityName = entityName;
    this.dataSource = null;
    this.repository = null;
    this.alias = entityName.toLowerCase();
    this.validOperators = ['lt', 'gt', 'lte', 'gte', 'eq', 'ne', 'in', 'is_null', 'not_null', 'like'];
  }

  /**
   * Get repository for the entity (Lazy Initialization)
   * 
   * This method implements lazy initialization pattern:
   * - dataSource and repository are only initialized when first needed
   * - Subsequent calls reuse the cached repository
   * - Prevents async operations in constructor
   * 
   * @returns {Promise<Object>} TypeORM repository for the entity
   * @throws {Error} If dataSource initialization fails
   */
  async getRepository() {
    if (!this.repository) {
      if (!this.dataSource) {
        try {
          this.dataSource = await getDataSource();
        } catch (error) {
          throw new Error(`Failed to initialize dataSource for ${this.entityName}: ${error.message}`);
        }
      }
      
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }
      
      this.repository = this.dataSource.getRepository(this.entityName);
    }
    return this.repository;
  }


  /**
   * Convert camelCase string to snake_case
   * 
   * @param {String} str - camelCase string
   * @returns {String} snake_case string
   */
  camelToSnakeCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  }

  /**
   * Convert snake_case string to camelCase
   * 
   * @param {String} str - snake_case string
   * @returns {String} camelCase string
   */
  snakeToCamelCase(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }



  /**
   * Check if field is allowed for filtering
   * Supports both camelCase and snake_case field names in allowedFields
   * 
   * @param {String} camelCaseField - Field name in camelCase
   * @param {String} snakeCaseField - Field name in snake_case
   * @param {Array} allowedFields - Array of allowed field names (can be camelCase or snake_case)
   * @returns {Boolean} True if field is allowed or if allowedFields is empty
   */
  /**
   * Check if a field is allowed, supporting both camelCase and snake_case formats
   * This method automatically handles conversion between camelCase and snake_case
   * to provide flexibility in field naming while maintaining security through allowlist
   * 
   * @param {String} camelCaseField - Field name in camelCase format
   * @param {String} snakeCaseField - Field name in snake_case format
   * @param {Array<String>} allowedFields - Array of allowed field names (can be camelCase or snake_case)
   * @returns {Boolean} True if field is allowed, false otherwise
   */
  isFieldAllowed(camelCaseField, snakeCaseField, allowedFields = []) {
    if (!allowedFields.length) return true;
    
    // Check both formats directly
    if (allowedFields.includes(camelCaseField) || allowedFields.includes(snakeCaseField)) {
      return true;
    }
    
    // Fallback: Try converting each allowed field to match the input format
    // This handles cases where allowedFields might be in different format than input
    for (const allowedField of allowedFields) {
      const allowedCamelCase = allowedField.includes('_') 
        ? this.snakeToCamelCase(allowedField) 
        : allowedField;
      const allowedSnakeCase = allowedField.includes('_') 
        ? allowedField 
        : this.camelToSnakeCase(allowedField);
      
      if (allowedCamelCase === camelCaseField || allowedSnakeCase === snakeCaseField) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Parse filters from query parameters (already parsed by Express qs parser)
   * 
   * Query format after parsing:
   * - field[operator]=value → { field: { operator: value } }
   * - memberShipDetails.category_type[eq]=FOW → { memberShipDetails: { category_type: { eq: "FOW" } } }
   * 
   * Supported operators:
   * - lt, gt, lte, gte: Comparison operators
   * - eq, ne: Equality operators
   * - in: Array/list matching
   * - like: Pattern matching (with % wildcard)
   * - is_null: Null check (field[is_null]=true)
   * - not_null: Not null check (field[not_null]=true)
   * 
   * Related fields:
   * - Format: tableName.fieldName[operator]=value
   * - Example: memberShipDetails.category_type[eq]=FOW
   * 
   * @param {Object} query - Query parameters from request (already parsed by Express qs parser)
   * @param {Object} options - Configuration options
   * @param {Array} options.allowedFields - Fields allowed for filtering (camelCase or snake_case)
   * @param {Object} options.defaultFilters - Default filters to always apply
   * @returns {Object} Parsed filters in nested format: 
   *   { field: [{ operator, value }], table: { field: [{ operator, value }] } }
   */
  parseFilters(query, options = {}) {
    const {
      allowedFields = [],
      defaultFilters = {},
    } = options;

    const filters = { ...defaultFilters };

    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === '') continue;

      if (typeof value === 'object' && !Array.isArray(value)) {
        const allKeysAreOperators = Object.keys(value).every(k => this.validOperators.includes(k));
        
        if (allKeysAreOperators) {
          // Direct field with operators: { field: { eq: value } }
          this.addFieldFilters(filters, key, value, allowedFields);
        } else {
          // Related fields (nested structure): { membershipDetails: { categoryType: ... } }
          const relatedFilters = {};
          for (const [fieldName, fieldValue] of Object.entries(value)) {
            if (fieldValue === null || fieldValue === undefined || fieldValue === '') continue;
            
            if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
              // Field has operators: { categoryType: { eq: 'FOM' } }
              this.addFieldFilters(relatedFilters, fieldName, fieldValue, allowedFields);
            } else {
              // Field without operator (default to eq): { categoryType: 'FOM' }
              this.addFieldFilters(relatedFilters, fieldName, { eq: fieldValue }, allowedFields);
            }
          }
          if (Object.keys(relatedFilters).length > 0) {
            filters[key] = relatedFilters;
          }
        }
      } else {
        // Direct field without operator (default to eq): { field: 'value' }
        this.addFieldFilters(filters, key, { eq: value }, allowedFields);
      }
    }

    return filters;
  }

  /**
   * Add field filters to filters object
   * 
   * @param {Object} filters - Filters object to add to
   * @param {String} fieldName - Field name
   * @param {Object} operators - Operators object { operator: value }
   * @param {Array} allowedFields - Allowed fields list
   */
  addFieldFilters(filters, fieldName, operators, allowedFields) {
    const camelCaseField = fieldName.includes('_') ? this.snakeToCamelCase(fieldName) : fieldName;
    const normalizedFieldName = this.camelToSnakeCase(fieldName);
    
        const isAllowed = 
      !allowedFields.length ||
      this.isFieldAllowed(camelCaseField, normalizedFieldName, allowedFields);
    
    if (!isAllowed) return;

    for (const [operator, operatorValue] of Object.entries(operators)) {
      if (operatorValue === null || operatorValue === undefined || operatorValue === '') continue;
      
      let normalizedValue = operatorValue;
      
      if (operator === 'is_null' || operator === 'not_null') {
        normalizedValue = null;
      } else if (operator === 'in') {
        normalizedValue = Array.isArray(operatorValue) 
          ? operatorValue 
          : (typeof operatorValue === 'string' ? operatorValue.split(',').map(v => v.trim()).filter(v => v) : [operatorValue]);
      }
      
      if (!filters[normalizedFieldName]) {
        filters[normalizedFieldName] = [];
              }
      
      filters[normalizedFieldName].push({
        operator: operator,
        value: normalizedValue
      });
        }
  }

  /**
   * Parse pagination parameters
   * 
   * @param {Object} query - Query parameters
   * @param {Object} options - Configuration options
   * @param {Number} options.defaultPage - Default page number (default: 1)
   * @param {Number} options.defaultLimit - Default limit (default: 50)
   * @param {Number} options.maxLimit - Maximum limit (default: 250)
   * @returns {Object} Pagination object with page and limit
   */
  parsePagination(query, options = {}) {
    const {
      defaultPage = 1,
      defaultLimit = 50,
      maxLimit = userConfig.DEFAULT_PAGE_SIZE || 250,
    } = options;

    const page = Math.max(1, parseInt(query.page) || defaultPage);
    const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit) || defaultLimit));

    return { page, limit };
  }

  /**
   * Parse sorting parameters
   * Supports both camelCase (sortBy/sortOrder) and snake_case (sort_by/sort_order)
   * camelCase is preferred to match API documentation
   * 
   * @param {Object} query - Query parameters
   * @param {Object} options - Configuration options
   * @param {String} options.defaultSortBy - Default sort field (camelCase or snake_case)
   * @param {String} options.defaultSortOrder - Default sort order (ASC/DESC)
   * @param {Array} options.allowedSortFields - Allowed fields for sorting (camelCase or snake_case)
   * @returns {Object} Sorting object with sort_by (snake_case) and sort_order
   */
  parseSorting(query, options = {}) {
    const {
      defaultSortBy = 'created_at',
      defaultSortOrder = 'DESC',
      allowedSortFields = [],
    } = options;

    let sortBy = query.sortBy || query.sort_by || defaultSortBy;
    const sortOrder = (query.sortOrder || query.sort_order || defaultSortOrder).toUpperCase();

    const normalizedDefaultSortBy = defaultSortBy.includes('_') 
      ? defaultSortBy 
      : this.camelToSnakeCase(defaultSortBy);

    if (allowedSortFields.length) {
      const snakeCaseSortBy = sortBy.includes('_') ? sortBy : this.camelToSnakeCase(sortBy);
      if (!allowedSortFields.includes(sortBy) && !allowedSortFields.includes(snakeCaseSortBy)) {
      return {
          sort_by: normalizedDefaultSortBy,
        sort_order: defaultSortOrder,
      };
    }
    }

    const normalizedSortBy = sortBy.includes('_') ? sortBy : this.camelToSnakeCase(sortBy);

    return {
      sort_by: normalizedSortBy,
      sort_order: sortOrder === 'ASC' ? 'ASC' : 'DESC',
    };
  }

  /**
   * Normalize object keys from camelCase to snake_case
   * 
   * @param {Object} obj - Object with camelCase keys
   * @returns {Object} Object with snake_case keys
   */
  normalizeKeys(obj) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[this.camelToSnakeCase(key)] = value;
    }
    return result;
  }

  /**
   * Normalize options to ensure consistency
   * Converts camelCase keys to snake_case where needed
   * This should be called at the beginning of buildQuery to normalize all options
   * 
   * @param {Object} options - Configuration options
   * @returns {Object} Normalized options
   */
  normalizeOptions(options = {}) {
    const normalizedOptions = { ...options };

    if (options.relatedFieldMappings) {
      normalizedOptions.relatedFieldMappings = this.normalizeKeys(options.relatedFieldMappings);
    }

    if (options.defaultFilters) {
      normalizedOptions.defaultFilters = this.normalizeKeys(options.defaultFilters);
    }

    return normalizedOptions;
  }

  /**
   * Build query builder with filters, pagination, and sorting
   * 
   * @param {Object} req - Request object
   * @param {Object} options - Configuration options
   * @param {Array} options.joins - Array of join configurations
   *   Example: [
   *     { type: 'leftJoin', entity: 'UserDetails', alias: 'userDetails', condition: 'user.id = userDetails.user_id' },
   *     { type: 'innerJoin', entity: 'UserMemberships', alias: 'memberships', condition: 'user.id = memberships.user_id' }
   *   ]
   * @returns {Promise<Object>} Query builder and metadata
   */
  async buildQuery(req, options = {}) {
    const repository = await this.getRepository();
    const queryBuilder = repository.createQueryBuilder(this.alias);

    const normalizedOptions = this.normalizeOptions(options);

    if (normalizedOptions.joins && Array.isArray(normalizedOptions.joins)) {
      this.applyJoins(queryBuilder, normalizedOptions.joins);
    }

    const filters = this.parseFilters(req.query || {}, normalizedOptions);
    this.applyFilters(queryBuilder, filters, normalizedOptions);

    const sorting = this.parseSorting(req.query || {}, normalizedOptions);
    this.applySorting(queryBuilder, sorting, normalizedOptions);

    const pagination = this.parsePagination(req.query || {}, normalizedOptions);

    return {
      queryBuilder,
      filters,
      sorting,
      pagination,
      options: normalizedOptions,
    };
  }

  /**
   * Apply joins to query builder
   * 
   * @param {Object} queryBuilder - TypeORM query builder
   * @param {Array} joins - Array of join configurations
   * 
   * Join configuration format:
   * {
   *   type: 'leftJoin' | 'innerJoin' | 'rightJoin' | 'leftJoinAndSelect' | 'innerJoinAndSelect',
   *   entity: 'EntityName' or table name,
   *   alias: 'aliasName',
   *   condition: 'user.id = alias.user_id' (optional, auto-generated if not provided)
   *   foreignKey: 'user_id' (optional, used to auto-generate condition)
   *   selectFields: ['field1', 'field2'] (optional, fields to select from joined table - prevents N+1)
   * }
   * 
   * Note: Use 'leftJoinAndSelect' or 'innerJoinAndSelect' to avoid N+1 query problem
   * These will automatically select all fields from the joined table.
   * If you only need specific fields, use 'leftJoin' with 'selectFields' option.
   */
  applyJoins(queryBuilder, joins) {
    joins.forEach(join => {
      const { 
        type = 'leftJoin', 
        entity, 
        alias, 
        condition, 
        foreignKey,
        selectFields = null, // Array of fields to select, or null to select all
      } = join;

      if (!entity || !alias) {
        throw new Error('Join configuration must have entity and alias');
      }

      let joinCondition = condition;
      if (!joinCondition && foreignKey) {
        joinCondition = `${this.alias}.id = ${alias}.${foreignKey}`;
      }

      switch (type.toLowerCase()) {
        case 'leftjoinandselect':
        case 'left_join_and_select':
          if (joinCondition) {
            queryBuilder.leftJoinAndSelect(entity, alias, joinCondition);
          } else {
            queryBuilder.leftJoinAndSelect(entity, alias);
          }
          break;
        case 'innerjoinandselect':
        case 'inner_join_and_select':
          if (joinCondition) {
            queryBuilder.innerJoinAndSelect(entity, alias, joinCondition);
          } else {
            queryBuilder.innerJoinAndSelect(entity, alias);
          }
          break;
        case 'leftjoin':
        case 'left_join':
          if (joinCondition) {
            queryBuilder.leftJoin(entity, alias, joinCondition);
          } else {
            queryBuilder.leftJoin(entity, alias);
          }
          if (selectFields && Array.isArray(selectFields) && selectFields.length > 0) {
            selectFields.forEach(field => {
              // GROUP_CONCAT aggregates multiple values to prevent data loss with GROUP BY
              queryBuilder.addSelect(
                `GROUP_CONCAT(DISTINCT ${alias}.${field} ORDER BY ${alias}.${field} SEPARATOR '|||')`,
                `${alias}_${field}`
              );
            });
          }
          break;
        case 'innerjoin':
        case 'inner_join':
          if (joinCondition) {
            queryBuilder.innerJoin(entity, alias, joinCondition);
          } else {
            queryBuilder.innerJoin(entity, alias);
          }
          if (selectFields && Array.isArray(selectFields) && selectFields.length > 0) {
            selectFields.forEach(field => {
              queryBuilder.addSelect(
                `GROUP_CONCAT(DISTINCT ${alias}.${field} ORDER BY ${alias}.${field} SEPARATOR '|||')`,
                `${alias}_${field}`
              );
            });
          }
          break;
        case 'rightjoin':
        case 'right_join':
          if (joinCondition) {
            queryBuilder.rightJoin(entity, alias, joinCondition);
          } else {
            queryBuilder.rightJoin(entity, alias);
          }
          if (selectFields && Array.isArray(selectFields) && selectFields.length > 0) {
            selectFields.forEach(field => {
              queryBuilder.addSelect(
                `GROUP_CONCAT(DISTINCT ${alias}.${field} ORDER BY ${alias}.${field} SEPARATOR '|||')`,
                `${alias}_${field}`
              );
            });
          }
          break;
        default:
          throw new Error(`Unsupported join type: ${type}`);
      }
    });
  }

  /**
   * Apply filters to query builder
   * Filters are in nested format: { field: [{ operator, value }], table: { field: [{ operator, value }] } }
   * 
   * @param {Object} queryBuilder - TypeORM query builder
   * @param {Object} filters - Parsed filters in nested format
   * @param {Object} options - Configuration options
   * @param {Object} options.fieldMappings - Optional field mappings for edge cases
   * @param {Object} options.relatedFieldMappings - Map query field names to related table fields
   */
  applyFilters(queryBuilder, filters, options = {}) {
    const { fieldMappings = {}, relatedFieldMappings = {} } = options;

    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        this.applyFieldConditions(queryBuilder, key, value, this.alias, fieldMappings, relatedFieldMappings);
      } else if (typeof value === 'object' && value !== null) {
        const tableAlias = key;
        for (const [fieldName, conditions] of Object.entries(value)) {
          if (Array.isArray(conditions)) {
            this.applyFieldConditions(queryBuilder, fieldName, conditions, tableAlias, fieldMappings, relatedFieldMappings);
          }
        }
      }
    }
  }

  /**
   * Apply conditions for a single field
   * 
   * @param {Object} queryBuilder - TypeORM query builder
   * @param {String} fieldName - Field name
   * @param {Array} conditions - Array of { operator, value }
   * @param {String} tableAlias - Table alias
   * @param {Object} fieldMappings - Field mappings
   * @param {Object} relatedFieldMappings - Related field mappings
   */
  applyFieldConditions(queryBuilder, fieldName, conditions, tableAlias, fieldMappings, relatedFieldMappings) {
    const camelCaseField = fieldName.includes('_') ? this.snakeToCamelCase(fieldName) : fieldName;
    const relatedMapping = relatedFieldMappings[camelCaseField] || relatedFieldMappings[fieldName];
    
    let finalTableAlias = tableAlias;
    let finalFieldName = fieldName;

      if (relatedMapping) {
      finalTableAlias = relatedMapping.alias;
      finalFieldName = relatedMapping.field || fieldName;
    } else if (tableAlias === this.alias) {
      finalFieldName = fieldMappings[fieldName] || fieldName;
        }

    for (let i = 0; i < conditions.length; i++) {
      const { operator, value } = conditions[i];
      const paramKey = `${finalTableAlias}_${finalFieldName}_${operator}_${i}`.replace(/\./g, '_');

      switch (operator) {
        case 'is_null':
          queryBuilder.andWhere(`${finalTableAlias}.${finalFieldName} IS NULL`);
          break;

        case 'not_null':
          queryBuilder.andWhere(`${finalTableAlias}.${finalFieldName} IS NOT NULL`);
          break;

        case 'in':
          if (Array.isArray(value) && value.length > 0) {
            queryBuilder.andWhere(`${finalTableAlias}.${finalFieldName} IN (:...${paramKey})`, {
              [paramKey]: value
            });
          }
          break;

        case 'like':
          queryBuilder.andWhere(`${finalTableAlias}.${finalFieldName} LIKE :${paramKey}`, {
            [paramKey]: value
          });
          break;

        case 'gt':
          {
        const parsedValue = this.parseComparisonValue(value);
        if (parsedValue !== null && parsedValue !== undefined) {
              queryBuilder.andWhere(`${finalTableAlias}.${finalFieldName} > :${paramKey}`, {
                [paramKey]: parsedValue
              });
        }
      }
          break;

        case 'lt':
          {
        const parsedValue = this.parseComparisonValue(value);
        if (parsedValue !== null && parsedValue !== undefined) {
              queryBuilder.andWhere(`${finalTableAlias}.${finalFieldName} < :${paramKey}`, {
                [paramKey]: parsedValue
              });
        }
      }
          break;

        case 'gte':
          {
        const parsedValue = this.parseComparisonValue(value);
        if (parsedValue !== null && parsedValue !== undefined) {
              queryBuilder.andWhere(`${finalTableAlias}.${finalFieldName} >= :${paramKey}`, {
                [paramKey]: parsedValue
              });
        }
      }
          break;

        case 'lte':
          {
        const parsedValue = this.parseComparisonValue(value);
        if (parsedValue !== null && parsedValue !== undefined) {
              queryBuilder.andWhere(`${finalTableAlias}.${finalFieldName} <= :${paramKey}`, {
                [paramKey]: parsedValue
              });
        }
          }
          break;

        case 'eq':
          queryBuilder.andWhere(`${finalTableAlias}.${finalFieldName} = :${paramKey}`, {
            [paramKey]: value
          });
          break;

        case 'ne':
          queryBuilder.andWhere(`${finalTableAlias}.${finalFieldName} != :${paramKey}`, {
            [paramKey]: value
          });
          break;

        default:
          break;
      }
    }
  }


  /**
   * Parse numeric value from string
   * 
   * @param {String|Number} value - Value to parse
   * @returns {Number|null} Parsed number or null if invalid
   */
  parseNumericValue(value) {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const num = parseFloat(value);
      if (!isNaN(num) && isFinite(num)) {
        return num;
      }
    }
    return null;
  }

  /**
   * Parse comparison value - supports numeric, date, and string
   * For comparison operators (gt, lt, gte, lte), MySQL can compare:
   * - Numbers: direct comparison
   * - Dates: direct comparison (ISO format or MySQL date format)
   * - Strings: lexicographic comparison
   * 
   * @param {String|Number|Date} value - Value to parse
   * @returns {String|Number|Date|null} Parsed value or null if invalid
   */
  parseComparisonValue(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    if (typeof value === 'number') {
      return value;
    }
    
    if (value instanceof Date) {
      return value;
    }
    
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        return null;
      }
      
      const num = parseFloat(trimmed);
      if (!isNaN(num) && isFinite(num) && trimmed === String(num)) {
        return num;
      }
      
      return trimmed;
    }
    
    return value;
  }

  /**
   * Apply sorting to query builder
   * sorting.sort_by is already in snake_case (from parseSorting)
   * 
   * @param {Object} queryBuilder - TypeORM query builder
   * @param {Object} sorting - Sorting object (sort_by is already snake_case)
   * @param {Object} options - Configuration options
   * @param {Object} options.fieldMappings - Optional field mappings for edge cases
   */
  applySorting(queryBuilder, sorting, options = {}) {
    const { fieldMappings = {} } = options;
    const sortBy = fieldMappings[sorting.sort_by] || sorting.sort_by;
    queryBuilder.orderBy(`${this.alias}.${sortBy}`, sorting.sort_order);
  }

  /**
   * Format data with grouped related fields
   * Groups fields from joined tables (with alias prefix) into separate objects
   * 
   * Example:
   * Input: { user_id: 1, user_email: 'test@example.com', membershipDetails_id: 123, membershipDetails_category_type: 'FOM' }
   * Output: { id: 1, email: 'test@example.com', membershipDetails: { id: 123, category_type: 'FOM' } }
   * 
   * @param {Array} rawData - Raw data from getRawMany() (fields have alias prefix like 'user_id', 'membershipDetails_id')
   * @param {Array} joins - Array of join configurations with alias and selectFields
   * @returns {Array} Formatted data with grouped related fields
   */
  formatDataWithRelatedFields(rawData, joins = []) {
    return rawData.map(item => {
      const formattedItem = {};
      const relatedFieldsMap = {};
      
      for (const [key, value] of Object.entries(item)) {
        let fieldAssigned = false;
        
        for (const join of joins) {
          const { alias, selectFields = [] } = join;
          if (!alias) continue;
          
          const prefix = `${alias}_`;
          if (key.startsWith(prefix)) {
            const fieldName = key.replace(prefix, '');
            
            if (selectFields.includes(fieldName)) {
              if (!relatedFieldsMap[alias]) {
                relatedFieldsMap[alias] = {};
              }
              // Parse GROUP_CONCAT values (separated by '|||')
              if (value && typeof value === 'string' && value.includes('|||')) {
                relatedFieldsMap[alias][fieldName] = value.split('|||').filter(v => v !== null && v !== '');
              } else {
                relatedFieldsMap[alias][fieldName] = value;
              }
              fieldAssigned = true;
              break;
            }
          }
        }
        
        if (!fieldAssigned) {
          const mainPrefix = `${this.alias}_`;
          if (key.startsWith(mainPrefix)) {
            const fieldName = key.replace(mainPrefix, '');
            formattedItem[fieldName] = value;
          } else {
            formattedItem[key] = value;
          }
        }
      }
      
      for (const [alias, relatedFields] of Object.entries(relatedFieldsMap)) {
        const hasData = Object.values(relatedFields).some(v => v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : true));
        if (hasData) {
          const hasArrayFields = Object.values(relatedFields).some(v => Array.isArray(v) && v.length > 1);
          
          if (hasArrayFields) {
            const maxLength = Math.max(...Object.values(relatedFields)
              .filter(v => Array.isArray(v))
              .map(v => v.length));
            
            const relatedArray = [];
            for (let i = 0; i < maxLength; i++) {
              const relatedObj = {};
              for (const [fieldName, fieldValue] of Object.entries(relatedFields)) {
                if (Array.isArray(fieldValue)) {
                  relatedObj[fieldName] = fieldValue[i] || null;
                } else {
                  relatedObj[fieldName] = fieldValue;
                }
              }
              if (Object.values(relatedObj).some(v => v !== null && v !== undefined)) {
                relatedArray.push(relatedObj);
              }
            }
            
            formattedItem[alias] = relatedArray.length === 1 ? relatedArray[0] : relatedArray;
          } else {
            formattedItem[alias] = relatedFields;
          }
        }
      }
      
      return formattedItem;
    });
  }

  /**
   * Execute query with pagination
   * 
   * @param {Object} queryBuilder - TypeORM query builder
   * @param {Object} pagination - Pagination object
   * @param {Object} options - Configuration options
   * @param {Array} options.joins - Array of join configurations (for formatting related fields)
   * @returns {Promise<Object>} Query result with data, total, and pagination info
   * 
   * Note: This method uses getRawMany() to get raw data, then formats it with grouped related fields
   * When joins are present, uses DISTINCT to avoid duplicate rows from one-to-many relationships
   */
  async executeQuery(queryBuilder, pagination, options = {}) {
    const hasJoins = options.joins && options.joins.length > 0;
    
    const countQueryBuilder = queryBuilder.clone();
    
    // Count total records efficiently
    // For joins: Use COUNT(DISTINCT user.id) to avoid counting duplicate rows from one-to-many relationships
    // This is more efficient than fetching all rows and counting in memory
    let total;
    if (hasJoins) {
      // Clear any existing selects and use COUNT(DISTINCT) for accurate counting with joins
      countQueryBuilder.select([]);
      countQueryBuilder.addSelect(`COUNT(DISTINCT ${this.alias}.id)`, 'total');
      // Remove pagination from count query (not needed for counting)
      countQueryBuilder.skip(undefined).take(undefined);
      const countResult = await countQueryBuilder.getRawOne();
      total = parseInt(countResult?.total || 0, 10);
    } else {
      // For queries without joins, use TypeORM's built-in getCount() which is optimized
      total = await countQueryBuilder.getCount();
    }

    // When joins are present, use GROUP BY to ensure one row per user
    // This prevents duplicate rows from one-to-many relationships (e.g., multiple membership records per user)
    // 
    // NOTE: MySQL ONLY_FULL_GROUP_BY mode requires all non-grouped columns to be aggregated.
    // - Main table columns (user.*): Since user.id is unique (primary key), all other user columns
    //   are identical per user.id, so MySQL accepts them even with ONLY_FULL_GROUP_BY
    // - Joined table columns: Already aggregated using GROUP_CONCAT(DISTINCT ...) in applyJoins()
    //   when using leftJoin/innerJoin with selectFields
    // 
    // If you encounter ONLY_FULL_GROUP_BY errors, consider:
    // 1. Ensure joined fields use GROUP_CONCAT aggregation (already handled in applyJoins)
    // 2. Using a subquery approach for complex cases
    // 3. Explicitly aggregating non-grouped columns with MIN()/MAX()/ANY_VALUE()
    if (hasJoins) {
      queryBuilder.groupBy(`${this.alias}.id`);
    }

    const skip = (pagination.page - 1) * pagination.limit;
    queryBuilder.skip(skip).take(pagination.limit);

    const rawData = await queryBuilder.getRawMany();
    const formattedData = this.formatDataWithRelatedFields(rawData, options.joins || []);

    return {
      data: formattedData,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  /**
   * Format response with pagination metadata
   * 
   * @param {Object} result - Query result from executeQuery
   * @param {Function} formatter - Optional formatter function for each item
   * @returns {Object} Formatted response
   */
  formatResponse(result, formatter = null) {
    const formattedData = formatter
      ? result.data.map(item => formatter(item))
      : result.data;

    return {
      status: 'success',
      statusCode: 200,
      data: {
        items: formattedData,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
    };
  }

  /**
   * Get single item by ID
   * 
   * @param {Number} id - Item ID
   * @returns {Promise<Object|null>} Item or null if not found
   */
  async findById(id) {
    const repository = await this.getRepository();
    return await repository.findOne({
      where: { id },
    });
  }

  /**
   * Get single item by field
   * 
   * @param {String} field - Field name
   * @param {*} value - Field value
   * @returns {Promise<Object|null>} Item or null if not found
   */
  async findByField(field, value) {
    const repository = await this.getRepository();
    return await repository.findOne({
      where: { [field]: value },
    });
  }
}

module.exports = BaseService;

