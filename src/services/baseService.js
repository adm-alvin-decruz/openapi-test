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
    // Lazy initialization: only create repository when needed
    if (!this.repository) {
      // Lazy initialization: only create dataSource when needed
      if (!this.dataSource) {
        try {
          this.dataSource = await getDataSource();
        } catch (error) {
          throw new Error(`Failed to initialize dataSource for ${this.entityName}: ${error.message}`);
        }
      }
      
      // Ensure dataSource is initialized before getting repository
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
   * Extract operator from field name (e.g., 'createdAtFrom' -> {baseField: 'createdAt', operatorSuffix: '_from'})
   * 
   * @param {String} fieldKey - Field key that may contain operator (camelCase)
   * @returns {Object} Object with baseField and operatorSuffix
   */
  extractOperator(fieldKey) {
        let baseField = fieldKey;
        let operatorSuffix = '';
        
        if (fieldKey.match(/NotNull$/i)) {
          baseField = fieldKey.replace(/NotNull$/i, '');
          operatorSuffix = '_not_null';
        } else if (fieldKey.match(/IsNull$/i)) {
          baseField = fieldKey.replace(/IsNull$/i, '');
          operatorSuffix = '_is_null';
        } else if (fieldKey.endsWith('From')) {
          baseField = fieldKey.replace(/From$/i, '');
          operatorSuffix = '_from';
        } else if (fieldKey.endsWith('To') && fieldKey !== 'to') {
          baseField = fieldKey.replace(/To$/i, '');
          operatorSuffix = '_to';
        }
        
    return { baseField, operatorSuffix };
  }

  /**
   * Find entity field name from query field key
   * Converts camelCase query field to snake_case database field
   * 
   * @param {String} fieldKey - Query field key (camelCase, may include operators like 'createdAtFrom')
   * @param {Object} fieldMappings - Optional field mappings for edge cases
   * @returns {String} Entity field name in snake_case
   */
  findEntityField(fieldKey, fieldMappings = {}) {
    // If fieldMappings provided (edge cases), use it first
    if (fieldMappings[fieldKey]) {
      return fieldMappings[fieldKey];
    }
    
    // Extract operator (From, To, IsNull, NotNull)
    const { baseField, operatorSuffix } = this.extractOperator(fieldKey);
    
    // If base field has mapping, use it
        if (fieldMappings[baseField]) {
          return fieldMappings[baseField] + operatorSuffix;
        }
        
    // Default: convert camelCase base field to snake_case
    const snakeCaseField = this.camelToSnakeCase(baseField);
    return snakeCaseField + operatorSuffix;
  }

  /**
   * Parse field name with operator from query parameter
   * Supports format: field[operator]=value or related.field[operator]=value
   * 
   * @param {String} key - Query parameter key (e.g., 'orders.total_amount[gt]')
   * @returns {Object} Object with fieldName, operator, and isRelated
   *   Example: { fieldName: 'orders.total_amount', operator: 'gt', isRelated: true }
   */
  parseFieldWithOperator(key) {
    // Match pattern: field[operator] or related.field[operator]
    const match = key.match(/^(.+?)\[([a-z]+)\]$/i);
    if (match) {
      const fieldName = match[1];
      const operator = match[2].toLowerCase();
      const isRelated = fieldName.includes('.');
      
      // Validate operator
      const validOperators = ['gt', 'lt', 'gte', 'lte', 'eq', 'ne'];
      if (validOperators.includes(operator)) {
        return { fieldName, operator, isRelated };
      }
    }
    return null;
  }

  /**
   * Get base field name by removing operator suffix
   * Removes operators like _not_null, _is_null, _from, _to, _in, _gt, _lt, etc. from field name
   * Only removes suffix at the end of the field name (safer than replace)
   * 
   * @param {String} fieldKey - Field key that may contain operator suffix (snake_case)
   * @returns {String} Base field name without operator suffix
   */
  getBaseFieldName(fieldKey) {
    // Remove operator suffix only if it's at the end (safer)
    if (fieldKey.endsWith('_not_null')) {
      return fieldKey.replace(/_not_null$/, '');
    }
    if (fieldKey.endsWith('_is_null')) {
      return fieldKey.replace(/_is_null$/, '');
    }
    if (fieldKey.endsWith('_from')) {
      return fieldKey.replace(/_from$/, '');
    }
    if (fieldKey.endsWith('_to')) {
      return fieldKey.replace(/_to$/, '');
    }
    if (fieldKey.endsWith('_in')) {
      return fieldKey.replace(/_in$/, '');
    }
    // Comparison operators
    if (fieldKey.endsWith('_gt')) {
      return fieldKey.replace(/_gt$/, '');
    }
    if (fieldKey.endsWith('_lt')) {
      return fieldKey.replace(/_lt$/, '');
    }
    if (fieldKey.endsWith('_gte')) {
      return fieldKey.replace(/_gte$/, '');
    }
    if (fieldKey.endsWith('_lte')) {
      return fieldKey.replace(/_lte$/, '');
    }
    if (fieldKey.endsWith('_eq')) {
      return fieldKey.replace(/_eq$/, '');
    }
    if (fieldKey.endsWith('_ne')) {
      return fieldKey.replace(/_ne$/, '');
    }
        return fieldKey;
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
  isFieldAllowed(camelCaseField, snakeCaseField, allowedFields = []) {
    if (!allowedFields.length) return true;
    return allowedFields.includes(camelCaseField) || allowedFields.includes(snakeCaseField);
  }

  /**
   * Parse filters from query parameters
   * Supports:
   * - Exact match: ?field=value (default, uses index efficiently)
   * - Like match: ?field=value% or ?field=%value% (only when % wildcard is explicitly provided)
   *   Note: Underscore (_) in values does NOT trigger LIKE to avoid unintended wildcard matching
   * - Range: ?fieldFrom=value&fieldTo=value
   * - In: ?field=value1,value2,value3
   * - Not null: ?fieldNotNull=true
   * - Is null: ?fieldIsNull=true
   * - Comparison operators: ?field[gt]=100, ?field[lt]=100, ?field[gte]=100, ?field[lte]=100, ?field[eq]=100, ?field[ne]=100
   * - Related fields with operators: ?orders.total_amount[gt]=100
   * 
   * Query parameters are in camelCase and will be automatically converted to snake_case
   * 
   * @param {Object} query - Query parameters from request (camelCase)
   * @param {Object} options - Configuration options
   * @param {Array} options.allowedFields - Fields allowed for filtering (camelCase or snake_case)
   * @param {Object} options.fieldMappings - Map query field names to entity field names (for edge cases)
   * @param {Object} options.defaultFilters - Default filters to always apply (camelCase, will be converted)
   * @returns {Object} Parsed filters object (snake_case)
   */
  parseFilters(query, options = {}) {
    const {
      allowedFields = [],
      fieldMappings = {},
      defaultFilters = {},
    } = options;

    // Normalize defaultFilters: convert camelCase keys to snake_case
    const normalizedDefaultFilters = {};
    for (const [key, value] of Object.entries(defaultFilters)) {
      const snakeCaseKey = this.camelToSnakeCase(key);
      normalizedDefaultFilters[snakeCaseKey] = value;
    }
    const filters = { ...normalizedDefaultFilters };

    // Process each query parameter
    for (const [key, value] of Object.entries(query)) {
      if (!value || value === '') continue;

      // Handle comparison operators: field[operator]=value or related.field[operator]=value
      const fieldWithOperator = this.parseFieldWithOperator(key);
      if (fieldWithOperator) {
        const { fieldName, operator, isRelated } = fieldWithOperator;
        
        // For related fields (e.g., orders.total_amount), keep the dot notation
        // For main fields, convert camelCase to snake_case
        let normalizedFieldName;
        let baseFieldNameForCheck;
        
        if (isRelated) {
          // Related field: keep as-is but convert field name part to snake_case
          const parts = fieldName.split('.');
          if (parts.length === 2) {
            const [relatedTable, field] = parts;
            normalizedFieldName = `${relatedTable}.${this.camelToSnakeCase(field)}`;
            // For checking allowedFields, use just the field name (without table prefix)
            // Try both camelCase and snake_case versions
            // If field is already snake_case (total_amount), convert to camelCase for checking
            // If field is camelCase (totalAmount), keep as-is
            const camelCaseField = field.includes('_') ? this.snakeToCamelCase(field) : field;
            baseFieldNameForCheck = camelCaseField; // Use camelCase for checking (matches allowedFields format)
          } else {
            normalizedFieldName = fieldName; // Keep as-is if format is unexpected
            baseFieldNameForCheck = fieldName;
          }
        } else {
          // Main field: convert camelCase to snake_case
          normalizedFieldName = this.camelToSnakeCase(fieldName);
          baseFieldNameForCheck = fieldName;
        }
        
        // Check if field is allowed
        // For related fields, check the base field name (without table prefix)
        const snakeCaseBaseField = this.camelToSnakeCase(baseFieldNameForCheck);
        
        // Check if field is allowed (try multiple variations)
        // For related fields, check both camelCase and snake_case versions of the field name
        const isAllowed = 
          this.isFieldAllowed(baseFieldNameForCheck, snakeCaseBaseField, allowedFields) || 
          this.isFieldAllowed(fieldName, normalizedFieldName, allowedFields) ||
          // Also check if the full related field path is allowed (e.g., 'orders.totalAmount')
          (isRelated && allowedFields.some(field => {
            // Check various formats
            const fieldCamelCase = field.includes('_') ? this.snakeToCamelCase(field) : field;
            const fieldSnakeCase = this.camelToSnakeCase(field);
            return field === fieldName || 
              field === normalizedFieldName ||
              field === baseFieldNameForCheck ||
              field === snakeCaseBaseField ||
              field === fieldCamelCase ||
              field === fieldSnakeCase ||
              // Check if field matches the base field name (camelCase or snake_case)
              (field === baseFieldNameForCheck || field === snakeCaseBaseField);
          }));
        
        if (isAllowed) {
          // Store with operator suffix: field_gt, field_lt, etc.
          // Keep dot notation for related fields to identify them later
          filters[`${normalizedFieldName}_${operator}`] = value;
        }
        continue;
      }

      // Handle camelCase operators: NotNull
      // Support both main fields (singpassIdNotNull) and related fields (membershipDetails.validFromNotNull)
      if (key.match(/NotNull$/i) && value === 'true') {
        // Check if this is a related field (dot notation)
        if (key.includes('.')) {
          const parts = key.split('.');
          if (parts.length === 2) {
            const [relatedTable, fieldWithNotNull] = parts;
            const baseField = fieldWithNotNull.replace(/NotNull$/i, '');
            const normalizedFieldName = `${relatedTable}.${this.camelToSnakeCase(baseField)}_not_null`;
            const camelCaseField = baseField.includes('_') ? this.snakeToCamelCase(baseField) : baseField;
            const snakeCaseField = this.camelToSnakeCase(baseField);
            
            // Check if field is allowed (check base field name without table prefix)
            if (this.isFieldAllowed(camelCaseField, snakeCaseField, allowedFields) || 
                this.isFieldAllowed(key, normalizedFieldName, allowedFields)) {
              filters[normalizedFieldName] = true;
            }
          }
        } else {
          // Main field
          const entityField = this.findEntityField(key, fieldMappings);
          const { baseField } = this.extractOperator(key);
          const snakeCaseBaseField = this.camelToSnakeCase(baseField);
          if (this.isFieldAllowed(baseField, snakeCaseBaseField, allowedFields) || this.isFieldAllowed(key, entityField, allowedFields)) {
            filters[entityField] = true;
          }
        }
        continue;
      }

      // Handle camelCase operators: IsNull
      // Support both main fields (validFromIsNull) and related fields (membershipDetails.validFromIsNull)
      if (key.match(/IsNull$/i) && value === 'true') {
        // Check if this is a related field (dot notation)
        if (key.includes('.')) {
          const parts = key.split('.');
          if (parts.length === 2) {
            const [relatedTable, fieldWithIsNull] = parts;
            const baseField = fieldWithIsNull.replace(/IsNull$/i, '');
            const normalizedFieldName = `${relatedTable}.${this.camelToSnakeCase(baseField)}_is_null`;
            const camelCaseField = baseField.includes('_') ? this.snakeToCamelCase(baseField) : baseField;
            const snakeCaseField = this.camelToSnakeCase(baseField);
            
            // Check if field is allowed (check base field name without table prefix)
            if (this.isFieldAllowed(camelCaseField, snakeCaseField, allowedFields) || 
                this.isFieldAllowed(key, normalizedFieldName, allowedFields)) {
              filters[normalizedFieldName] = true;
            }
          }
        } else {
          // Main field
          const entityField = this.findEntityField(key, fieldMappings);
          const { baseField } = this.extractOperator(key);
          const snakeCaseBaseField = this.camelToSnakeCase(baseField);
          if (this.isFieldAllowed(baseField, snakeCaseBaseField, allowedFields) || this.isFieldAllowed(key, entityField, allowedFields)) {
            filters[entityField] = true;
          }
        }
        continue;
      }

      // Handle range filters: From (camelCase: createdAtFrom)
      // Support both main fields (validFromFrom) and related fields (membershipDetails.validFromFrom)
      if (key.endsWith('From')) {
        // Check if this is a related field (dot notation)
        if (key.includes('.')) {
          const parts = key.split('.');
          if (parts.length === 2) {
            const [relatedTable, fieldWithFrom] = parts;
            const baseField = fieldWithFrom.replace(/From$/i, '');
            const normalizedFieldName = `${relatedTable}.${this.camelToSnakeCase(baseField)}_from`;
            const camelCaseField = baseField.includes('_') ? this.snakeToCamelCase(baseField) : baseField;
            const snakeCaseField = this.camelToSnakeCase(baseField);
            
            // Check if field is allowed (check base field name without table prefix)
            if (this.isFieldAllowed(camelCaseField, snakeCaseField, allowedFields) || 
                this.isFieldAllowed(key, normalizedFieldName, allowedFields)) {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                filters[normalizedFieldName] = date.toISOString();
              }
            }
          }
        } else {
          // Main field
          const entityField = this.findEntityField(key, fieldMappings);
          if (this.isFieldAllowed(key, entityField, allowedFields)) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              filters[entityField] = date.toISOString();
            }
          }
        }
        continue;
      }

      // Handle range filters: To (camelCase: createdAtTo)
      // Support both main fields (validFromTo) and related fields (membershipDetails.validFromTo)
      if (key.endsWith('To') && key !== 'to') {
        // Check if this is a related field (dot notation)
        if (key.includes('.')) {
          const parts = key.split('.');
          if (parts.length === 2) {
            const [relatedTable, fieldWithTo] = parts;
            const baseField = fieldWithTo.replace(/To$/i, '');
            const normalizedFieldName = `${relatedTable}.${this.camelToSnakeCase(baseField)}_to`;
            const camelCaseField = baseField.includes('_') ? this.snakeToCamelCase(baseField) : baseField;
            const snakeCaseField = this.camelToSnakeCase(baseField);
            
            // Check if field is allowed (check base field name without table prefix)
            if (this.isFieldAllowed(camelCaseField, snakeCaseField, allowedFields) || 
                this.isFieldAllowed(key, normalizedFieldName, allowedFields)) {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                filters[normalizedFieldName] = date.toISOString();
              }
            }
          }
        } else {
          // Main field
          const entityField = this.findEntityField(key, fieldMappings);
          if (this.isFieldAllowed(key, entityField, allowedFields)) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              filters[entityField] = date.toISOString();
            }
          }
        }
        continue;
      }

      // Handle regular filters
      const entityField = this.findEntityField(key, fieldMappings);
      if (this.isFieldAllowed(key, entityField, allowedFields)) {
        const trimmedValue = typeof value === 'string' ? value.trim() : value;
        
        // Check if it's a comma-separated list (IN operator)
        if (typeof trimmedValue === 'string' && trimmedValue.includes(',')) {
          filters[`${entityField}_in`] = trimmedValue.split(',').map(v => v.trim()).filter(v => v);
        } else {
          filters[entityField] = trimmedValue;
        }
      }
    }

    return filters;
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

    // Support both camelCase (sortBy/sortOrder) and snake_case (sort_by/sort_order)
    // camelCase is preferred to match API documentation
    let sortBy = query.sortBy || query.sort_by || defaultSortBy;
    const sortOrder = (query.sortOrder || query.sort_order || defaultSortOrder).toUpperCase();

    // Normalize defaultSortBy to snake_case
    const normalizedDefaultSortBy = defaultSortBy.includes('_') 
      ? defaultSortBy 
      : this.camelToSnakeCase(defaultSortBy);

    // Validate sort field if allowed fields are specified (before conversion)
    // This allows allowedSortFields to contain camelCase fields
    if (allowedSortFields.length) {
      const snakeCaseSortBy = sortBy.includes('_') ? sortBy : this.camelToSnakeCase(sortBy);
      // Check both camelCase and snake_case versions
      if (!allowedSortFields.includes(sortBy) && !allowedSortFields.includes(snakeCaseSortBy)) {
      return {
          sort_by: normalizedDefaultSortBy,
        sort_order: defaultSortOrder,
      };
    }
    }

    // Convert to snake_case after validation
    const normalizedSortBy = sortBy.includes('_') ? sortBy : this.camelToSnakeCase(sortBy);

    return {
      sort_by: normalizedSortBy,
      sort_order: sortOrder === 'ASC' ? 'ASC' : 'DESC',
    };
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

    // Normalize relatedFieldMappings keys to snake_case
    // relatedFieldMappings might be defined with camelCase keys (e.g., 'categoryType')
    // but filters are already in snake_case (e.g., 'category_type')
    if (options.relatedFieldMappings) {
      const normalizedRelatedFieldMappings = {};
      for (const [key, value] of Object.entries(options.relatedFieldMappings)) {
        const normalizedKey = this.camelToSnakeCase(key);
        normalizedRelatedFieldMappings[normalizedKey] = value;
      }
      normalizedOptions.relatedFieldMappings = normalizedRelatedFieldMappings;
    }

    if (options.defaultFilters) {
      const normalizedDefaultFilters = {};
      for (const [key, value] of Object.entries(options.defaultFilters)) {
        const normalizedKey = this.camelToSnakeCase(key);
        normalizedDefaultFilters[normalizedKey] = value;
      }
      normalizedOptions.defaultFilters = normalizedDefaultFilters;
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

    // Normalize options FIRST - convert camelCase to snake_case where needed
    // This ensures all subsequent logic works with normalized options
    const normalizedOptions = this.normalizeOptions(options);

    // Apply joins if configured
    if (normalizedOptions.joins && Array.isArray(normalizedOptions.joins)) {
      this.applyJoins(queryBuilder, normalizedOptions.joins);
    }

    // Parse filters (uses normalizedOptions)
    const filters = this.parseFilters(req.query || {}, normalizedOptions);

    // Apply filters to query builder (uses normalizedOptions)
    this.applyFilters(queryBuilder, filters, normalizedOptions);

    // Parse and apply sorting (uses normalizedOptions)
    const sorting = this.parseSorting(req.query || {}, normalizedOptions);
    this.applySorting(queryBuilder, sorting, normalizedOptions);

    // Parse pagination (uses normalizedOptions)
    const pagination = this.parsePagination(req.query || {}, normalizedOptions);

    return {
      queryBuilder,
      filters,
      sorting,
      pagination,
      options: normalizedOptions, // Include normalized options for executeQuery
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

      // Auto-generate condition if not provided
      let joinCondition = condition;
      if (!joinCondition && foreignKey) {
        joinCondition = `${this.alias}.id = ${alias}.${foreignKey}`;
      }

      // Apply join based on type
      switch (type.toLowerCase()) {
        case 'leftjoinandselect':
        case 'left_join_and_select':
          // Use leftJoinAndSelect to avoid N+1 - automatically selects all fields
          if (joinCondition) {
            queryBuilder.leftJoinAndSelect(entity, alias, joinCondition);
          } else {
            queryBuilder.leftJoinAndSelect(entity, alias);
          }
          break;
        case 'innerjoinandselect':
        case 'inner_join_and_select':
          // Use innerJoinAndSelect to avoid N+1 - automatically selects all fields
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
          // Select specific fields if provided (to avoid N+1 when only filtering)
          if (selectFields && Array.isArray(selectFields) && selectFields.length > 0) {
            selectFields.forEach(field => {
              queryBuilder.addSelect(`${alias}.${field}`, `${alias}_${field}`);
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
          // Select specific fields if provided (to avoid N+1 when only filtering)
          if (selectFields && Array.isArray(selectFields) && selectFields.length > 0) {
            selectFields.forEach(field => {
              queryBuilder.addSelect(`${alias}.${field}`, `${alias}_${field}`);
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
          // Select specific fields if provided (to avoid N+1 when only filtering)
          if (selectFields && Array.isArray(selectFields) && selectFields.length > 0) {
            selectFields.forEach(field => {
              queryBuilder.addSelect(`${alias}.${field}`, `${alias}_${field}`);
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
   * Filters are already in snake_case (from parseFilters)
   * 
   * @param {Object} queryBuilder - TypeORM query builder
   * @param {Object} filters - Parsed filters (already in snake_case)
   * @param {Object} options - Configuration options
   * @param {Object} options.fieldMappings - Optional field mappings for edge cases
   * @param {Object} options.relatedFieldMappings - Map query field names to related table fields
   *   Example: { 'category_type': { alias: 'userDetails', field: 'category_type' } }
   */
  applyFilters(queryBuilder, filters, options = {}) {
    const { fieldMappings = {}, relatedFieldMappings = {} } = options;

    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === '') continue;

      // Check if this is a related field (format: orders.total_amount_gt or orders.total_amount)
      // key may contain dot notation for related fields
      let baseFieldName = this.getBaseFieldName(key);
      let relatedMapping = null;
      
      // Check if key contains dot notation (related field format)
      if (key.includes('.')) {
        const parts = key.split('.');
        if (parts.length === 2) {
          const [relatedTable, fieldWithOperator] = parts;
          // Remove operator suffix to get base field
          const baseField = fieldWithOperator.replace(/_(gt|lt|gte|lte|eq|ne|in|from|to|not_null|is_null)$/, '');
          // Try to find related mapping by checking camelCase field name
          const camelCaseField = this.snakeToCamelCase(baseField);
          // Check both camelCase and snake_case versions
          relatedMapping = relatedFieldMappings[camelCaseField] || relatedFieldMappings[baseField] || relatedFieldMappings[`${relatedTable}.${camelCaseField}`] || relatedFieldMappings[`${relatedTable}.${baseField}`];
        }
      } else {
        // Regular field: check relatedFieldMappings
        relatedMapping = relatedFieldMappings[key] || relatedFieldMappings[baseFieldName];
      }

      // Determine table alias and field name
      let tableAlias = this.alias;
      let fieldName = key;

      if (relatedMapping) {
        // This is a related field
        tableAlias = relatedMapping.alias;
        fieldName = relatedMapping.field || baseFieldName;
      } else if (key.includes('.')) {
        // Related field without mapping: extract field name from dot notation
        const parts = key.split('.');
        if (parts.length === 2) {
          const [relatedTable, fieldWithOperator] = parts;
          // Remove operator suffix to get base field
          const baseField = fieldWithOperator.replace(/_(gt|lt|gte|lte|eq|ne|in|from|to|not_null|is_null)$/, '');
          fieldName = this.camelToSnakeCase(baseField);
          tableAlias = relatedTable;
        } else {
          // This is a main entity field (already snake_case, use fieldMappings only for edge cases)
          fieldName = fieldMappings[key] || key;
        }
      } else {
        // This is a main entity field (already snake_case, use fieldMappings only for edge cases)
        fieldName = fieldMappings[key] || key;
      }

      // Handle NOT NULL
      if (key.endsWith('_not_null')) {
        // For main fields, use baseFieldName (without operator suffix)
        // For related fields, use fieldName (already processed from dot notation)
        const finalFieldName = relatedMapping 
          ? (relatedMapping.field || baseFieldName) 
          : (key.includes('.') ? fieldName : baseFieldName);
        const finalAlias = relatedMapping ? relatedMapping.alias : tableAlias;
        queryBuilder.andWhere(`${finalAlias}.${finalFieldName} IS NOT NULL`);
        continue;
      }

      // Handle IS NULL
      if (key.endsWith('_is_null')) {
        // For main fields, use baseFieldName (without operator suffix)
        // For related fields, use fieldName (already processed from dot notation)
        const finalFieldName = relatedMapping 
          ? (relatedMapping.field || baseFieldName) 
          : (key.includes('.') ? fieldName : baseFieldName);
        const finalAlias = relatedMapping ? relatedMapping.alias : tableAlias;
        queryBuilder.andWhere(`${finalAlias}.${finalFieldName} IS NULL`);
        continue;
      }

      // Handle range filters (FROM)
      if (key.endsWith('_from')) {
        // For main fields, use baseFieldName (without operator suffix)
        // For related fields, use fieldName (already processed from dot notation)
        const finalFieldName = relatedMapping 
          ? (relatedMapping.field || baseFieldName) 
          : (key.includes('.') ? fieldName : baseFieldName);
        const finalAlias = relatedMapping ? relatedMapping.alias : tableAlias;
        queryBuilder.andWhere(`${finalAlias}.${finalFieldName} >= :${key}`, {
          [key]: value,
        });
        continue;
      }

      // Handle range filters (TO)
      if (key.endsWith('_to')) {
        // For main fields, use baseFieldName (without operator suffix)
        // For related fields, use fieldName (already processed from dot notation)
        const finalFieldName = relatedMapping 
          ? (relatedMapping.field || baseFieldName) 
          : (key.includes('.') ? fieldName : baseFieldName);
        const finalAlias = relatedMapping ? relatedMapping.alias : tableAlias;
        queryBuilder.andWhere(`${finalAlias}.${finalFieldName} <= :${key}`, {
          [key]: value,
        });
        continue;
      }

      // Handle IN operator
      if (key.endsWith('_in') && Array.isArray(value)) {
        const finalFieldName = relatedMapping ? (relatedMapping.field || baseFieldName) : baseFieldName;
        const finalAlias = relatedMapping ? relatedMapping.alias : this.alias;
        queryBuilder.andWhere(`${finalAlias}.${finalFieldName} IN (:...${key})`, {
          [key]: value,
        });
        continue;
      }

      // Handle comparison operators: gt, lt, gte, lte, eq, ne
      // Support both main fields and related fields (e.g., orders.total_amount_gt)
      if (key.endsWith('_gt')) {
        const { finalFieldName, finalAlias } = this.getFieldAndAliasForComparison(key, relatedMapping, baseFieldName, tableAlias, fieldName);
        const numValue = this.parseNumericValue(value);
        if (numValue !== null) {
          queryBuilder.andWhere(`${finalAlias}.${finalFieldName} > :${key}`, { [key]: numValue });
        }
        continue;
      }

      if (key.endsWith('_lt')) {
        const { finalFieldName, finalAlias } = this.getFieldAndAliasForComparison(key, relatedMapping, baseFieldName, tableAlias, fieldName);
        const numValue = this.parseNumericValue(value);
        if (numValue !== null) {
          queryBuilder.andWhere(`${finalAlias}.${finalFieldName} < :${key}`, { [key]: numValue });
        }
        continue;
      }

      if (key.endsWith('_gte')) {
        const { finalFieldName, finalAlias } = this.getFieldAndAliasForComparison(key, relatedMapping, baseFieldName, tableAlias, fieldName);
        const numValue = this.parseNumericValue(value);
        if (numValue !== null) {
          queryBuilder.andWhere(`${finalAlias}.${finalFieldName} >= :${key}`, { [key]: numValue });
        }
        continue;
      }

      if (key.endsWith('_lte')) {
        const { finalFieldName, finalAlias } = this.getFieldAndAliasForComparison(key, relatedMapping, baseFieldName, tableAlias, fieldName);
        const numValue = this.parseNumericValue(value);
        if (numValue !== null) {
          queryBuilder.andWhere(`${finalAlias}.${finalFieldName} <= :${key}`, { [key]: numValue });
        }
        continue;
      }

      if (key.endsWith('_eq')) {
        const { finalFieldName, finalAlias } = this.getFieldAndAliasForComparison(key, relatedMapping, baseFieldName, tableAlias, fieldName);
        queryBuilder.andWhere(`${finalAlias}.${finalFieldName} = :${key}`, { [key]: value });
        continue;
      }

      if (key.endsWith('_ne')) {
        const { finalFieldName, finalAlias } = this.getFieldAndAliasForComparison(key, relatedMapping, baseFieldName, tableAlias, fieldName);
        queryBuilder.andWhere(`${finalAlias}.${finalFieldName} != :${key}`, { [key]: value });
        continue;
      }

      // Handle LIKE only when wildcard % is explicitly provided
      // Do NOT use LIKE for underscore (_) as it's a valid character in emails/IDs
      // and would cause unintended wildcard matching (e.g., john_doe@example.com would match john@doe@example.com)
      if (typeof value === 'string' && value.includes('%')) {
        queryBuilder.andWhere(`${tableAlias}.${fieldName} LIKE :${key}`, { [key]: value });
        continue;
      }

      // Handle exact match (default - uses index efficiently)
      queryBuilder.andWhere(`${tableAlias}.${fieldName} = :${key}`, { [key]: value });
    }
  }

  /**
   * Get field name and alias for comparison operators
   * Handles both main fields and related fields (e.g., orders.total_amount_gt)
   * 
   * @param {String} key - Filter key (e.g., 'orders.total_amount_gt' or 'total_amount_gt')
   * @param {Object} relatedMapping - Related field mapping (if exists, from relatedFieldMappings)
   * @param {String} baseFieldName - Base field name without operator (already processed)
   * @param {String} tableAlias - Current table alias (already determined)
   * @returns {Object} Object with finalFieldName and finalAlias
   */
  getFieldAndAliasForComparison(key, relatedMapping, baseFieldName, tableAlias) {
    // If key contains dot notation (related field format: orders.total_amount_gt)
    if (key.includes('.')) {
      const parts = key.split('.');
      if (parts.length === 2) {
        const [relatedTable, fieldWithOperator] = parts;
        // Remove operator suffix to get base field
        const baseField = fieldWithOperator.replace(/_(gt|lt|gte|lte|eq|ne)$/, '');
        // Convert to snake_case for SQL
        const snakeCaseField = this.camelToSnakeCase(baseField);
        
        // If we have a related mapping (found in applyFilters), use it
        if (relatedMapping) {
          return {
            finalFieldName: relatedMapping.field || snakeCaseField,
            finalAlias: relatedMapping.alias,
          };
        }
        
        // If no mapping found, assume the relatedTable is the alias
        // This works if the join alias matches the table name (e.g., 'orders' table with 'orders' alias)
        return {
          finalFieldName: snakeCaseField,
          finalAlias: relatedTable,
        };
      }
    }
    
    // For main fields or fields with relatedMapping already found
    if (relatedMapping) {
      return {
        finalFieldName: relatedMapping.field || baseFieldName,
        finalAlias: relatedMapping.alias,
      };
    }
    
    // Default: use baseFieldName (without operator suffix) and tableAlias
    // baseFieldName is already processed and doesn't contain operator suffix
    return {
      finalFieldName: baseFieldName,
      finalAlias: tableAlias,
    };
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
    // Use fieldMappings if provided (edge cases), otherwise use sort_by as-is (already snake_case)
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
      const relatedFieldsMap = {}; // Map to store related fields by alias
      
      // Process each field in the raw item
      for (const [key, value] of Object.entries(item)) {
        let fieldAssigned = false;
        
        // Check if this field belongs to a joined table
        for (const join of joins) {
          const { alias, selectFields = [] } = join;
          if (!alias) continue;
          
          // Check if field matches this alias prefix
          const prefix = `${alias}_`;
          if (key.startsWith(prefix)) {
            const fieldName = key.replace(prefix, '');
            
            // Only process if field is in selectFields
            if (selectFields.includes(fieldName)) {
              if (!relatedFieldsMap[alias]) {
                relatedFieldsMap[alias] = {};
              }
              relatedFieldsMap[alias][fieldName] = value;
              fieldAssigned = true;
              break;
            }
          }
        }
        
        // If not assigned to any join, it's a main entity field
        // Remove alias prefix if exists (e.g., 'user_id' -> 'id')
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
      
      // Add grouped related fields
      for (const [alias, relatedFields] of Object.entries(relatedFieldsMap)) {
        // Only add if there's at least one non-null field
        const hasData = Object.values(relatedFields).some(v => v !== null && v !== undefined);
        if (hasData) {
          formattedItem[alias] = relatedFields;
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
    
    // Clone query builder for count (to avoid modifying the original)
    const countQueryBuilder = queryBuilder.clone();
    
    // Get total count before pagination
    // When joins are present, use GROUP BY and count groups to avoid inflated counts
    let total;
    if (hasJoins) {
      // Apply GROUP BY to count distinct users (not rows)
      // This ensures accurate count when users have multiple related records
      countQueryBuilder.groupBy(`${this.alias}.id`);
      const groupedRows = await countQueryBuilder.getRawMany();
      total = groupedRows.length;
    } else {
      // No joins, use standard count
      total = await countQueryBuilder.getCount();
    }

    // Apply GROUP BY on main entity ID when joins are present to avoid duplicate users
    // This ensures one row per user even when user has multiple related records
    if (hasJoins) {
      queryBuilder.groupBy(`${this.alias}.id`);
    }

    // Apply pagination
    const skip = (pagination.page - 1) * pagination.limit;
    queryBuilder.skip(skip).take(pagination.limit);

    // Execute query - get raw data
    // getRawMany() returns flat objects with alias-prefixed fields (e.g., 'user_id', 'membershipDetails_id')
    const rawData = await queryBuilder.getRawMany();

    // Format data with grouped related fields
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

