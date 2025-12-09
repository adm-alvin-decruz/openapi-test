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
   * Normalize defaultFilters keys from camelCase to snake_case
   * 
   * @param {Object} defaultFilters - Default filters object
   * @returns {Object} Normalized default filters
   */
  normalizeDefaultFilters(defaultFilters) {
    const normalizedDefaultFilters = {};
    for (const [key, value] of Object.entries(defaultFilters)) {
      // Convert to snake_case first
      // If already snake_case (contains '_'), keep as is; otherwise convert camelCase
      const normalizedKey = key.includes('_') ? key : this.camelToSnakeCase(key);
      
      normalizedDefaultFilters[normalizedKey] = value;
    }
    return normalizedDefaultFilters;
  }

  /**
   * Parse filters from query parameters
   * Supports:
   * - Exact match: ?field=value
   * - Like match: ?field=value% or ?field=%value%
   * - Range: ?field_from=value&field_to=value (or ?fieldFrom=value&fieldTo=value with normalizeCamelCase)
   * - In: ?field=value1,value2,value3
   * - Not null: ?field_not_null=true (or ?fieldNotNull=true with normalizeCamelCase)
   * - Is null: ?field_is_null=true (or ?fieldIsNull=true with normalizeCamelCase)
   * 
   * @param {Object} query - Query parameters from request
   * @param {Object} options - Configuration options
   * @param {Array} options.allowedFields - Fields allowed for filtering
   * @param {Object} options.fieldMappings - Map query field names to entity field names
   * @param {Object} options.defaultFilters - Default filters to always apply
   * @param {Boolean} options.normalizeCamelCase - Whether to normalize camelCase operators (default: false)
   * @returns {Object} Parsed filters object
   */
  parseFilters(query, options = {}) {
    const {
      allowedFields = [],
      fieldMappings = {},
      defaultFilters = {},
      normalizeCamelCase = false,
    } = options;

    // Keep query as-is (camelCase), no normalization needed
    // fieldMappings will handle camelCase -> snake_case conversion
    const normalizedQuery = query;
    
    // Normalize defaultFilters if requested
    const normalizedDefaultFilters = normalizeCamelCase 
      ? this.normalizeDefaultFilters(defaultFilters)
      : defaultFilters;

    // Update allowedFields to include mapped fields for validation
    // baseService validates entityField (after mapping), so we need mapped fields in allowedFields
    let finalAllowedFields = allowedFields;
    if (normalizeCamelCase && allowedFields.length && Object.keys(fieldMappings).length) {
      const mappedFields = Object.values(fieldMappings);
      // Also add base field names without operators for operators like _from, _to
      const baseMappedFields = mappedFields.map(field => {
        if (field.endsWith('_from')) return field.replace('_from', '');
        if (field.endsWith('_to')) return field.replace('_to', '');
        return field;
      });
      finalAllowedFields = [
        ...new Set([...allowedFields, ...mappedFields, ...baseMappedFields]),
      ];
    }

    const filters = { ...normalizedDefaultFilters };

    // Process each query parameter
    for (const [key, value] of Object.entries(normalizedQuery)) {
      if (!value || value === '') continue;

      // Helper function to find entityField from fieldMappings
      // fieldMappings maps camelCase -> snake_case (e.g., 'mandaiId' -> 'mandai_id')
      // fieldKey is camelCase (may include operators like 'createdAtFrom', 'deleteAtIsNull')
      const findEntityField = (fieldKey) => {
        // Try direct mapping first
        if (fieldMappings[fieldKey]) {
          return fieldMappings[fieldKey];
        }
        
        // Extract base field name from camelCase operators
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
        
        // Look up base field in fieldMappings
        if (fieldMappings[baseField]) {
          return fieldMappings[baseField] + operatorSuffix;
        }
        
        // Return as-is if no mapping found
        return fieldKey;
      };

      // Handle camelCase operators
      if (key.match(/NotNull$/i) && value === 'true') {
        const entityField = findEntityField(key);
        // Check if base field (without operator) is in allowedFields
        const baseField = key.replace(/NotNull$/i, '');
        if (!finalAllowedFields.length || finalAllowedFields.includes(baseField) || finalAllowedFields.includes(key)) {
          filters[entityField] = true; // entityField already includes _not_null suffix
        }
        continue;
      }

      if (key.match(/IsNull$/i) && value === 'true') {
        const entityField = findEntityField(key);
        // Check if base field (without operator) is in allowedFields
        const baseField = key.replace(/IsNull$/i, '');
        if (!finalAllowedFields.length || finalAllowedFields.includes(baseField) || finalAllowedFields.includes(key)) {
          filters[entityField] = true; // entityField already includes _is_null suffix
        }
        continue;
      }

      // Handle range filters (camelCase: createdAtFrom, createdAtTo)
      if (key.endsWith('From')) {
        const entityField = findEntityField(key);
        if (!finalAllowedFields.length || finalAllowedFields.includes(entityField)) {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            filters[entityField] = date.toISOString();
          }
        }
        continue;
      }

      if (key.endsWith('To') && key !== 'to') {
        const entityField = findEntityField(key);
        if (!finalAllowedFields.length || finalAllowedFields.includes(entityField)) {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            filters[entityField] = date.toISOString();
          }
        }
        continue;
      }

      // Handle regular filters
      const entityField = findEntityField(key);
      if (!finalAllowedFields.length || finalAllowedFields.includes(entityField)) {
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
   * 
   * @param {Object} query - Query parameters
   * @param {Object} options - Configuration options
   * @param {String} options.defaultSortBy - Default sort field
   * @param {String} options.defaultSortOrder - Default sort order (ASC/DESC)
   * @param {Array} options.allowedSortFields - Allowed fields for sorting
   * @returns {Object} Sorting object with sort_by and sort_order
   */
  parseSorting(query, options = {}) {
    const {
      defaultSortBy = 'created_at',
      defaultSortOrder = 'DESC',
      allowedSortFields = [],
    } = options;

    const sortBy = query.sort_by || defaultSortBy;
    const sortOrder = (query.sort_order || defaultSortOrder).toUpperCase();

    // Validate sort field if allowed fields are specified
    if (allowedSortFields.length && !allowedSortFields.includes(sortBy)) {
      return {
        sort_by: defaultSortBy,
        sort_order: defaultSortOrder,
      };
    }

    return {
      sort_by: sortBy,
      sort_order: sortOrder === 'ASC' ? 'ASC' : 'DESC',
    };
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

    // Apply joins if configured
    if (options.joins && Array.isArray(options.joins)) {
      this.applyJoins(queryBuilder, options.joins);
    }

    // Parse filters
    const filters = this.parseFilters(req.query || {}, options);

    // Apply filters to query builder
    this.applyFilters(queryBuilder, filters, options);

    // Parse and apply sorting
    const sorting = this.parseSorting(req.query || {}, options);
    this.applySorting(queryBuilder, sorting, options);

    // Parse pagination
    const pagination = this.parsePagination(req.query || {}, options);

    return {
      queryBuilder,
      filters,
      sorting,
      pagination,
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
   * 
   * @param {Object} queryBuilder - TypeORM query builder
   * @param {Object} filters - Parsed filters
   * @param {Object} options - Configuration options
   * @param {Object} options.fieldMappings - Map query field names to entity field names
   * @param {Object} options.relatedFieldMappings - Map query field names to related table fields
   *   Example: { 'phone_number': { alias: 'userDetails', field: 'phone_number' } }
   */
  applyFilters(queryBuilder, filters, options = {}) {
    const { fieldMappings = {}, relatedFieldMappings = {} } = options;

    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === '') continue;

      // Check if this is a related field
      const relatedMapping = relatedFieldMappings[key] || 
                             relatedFieldMappings[key.replace('_not_null', '')] ||
                             relatedFieldMappings[key.replace('_is_null', '')] ||
                             relatedFieldMappings[key.replace('_from', '')] ||
                             relatedFieldMappings[key.replace('_to', '')] ||
                             relatedFieldMappings[key.replace('_in', '')];

      // Determine table alias and field name
      let tableAlias = this.alias;
      let fieldName = key;

      if (relatedMapping) {
        // This is a related field
        tableAlias = relatedMapping.alias;
        fieldName = relatedMapping.field || key;
      } else {
        // This is a main entity field
        fieldName = fieldMappings[key] || key;
      }

      // Handle NOT NULL
      if (key.endsWith('_not_null')) {
        const baseFieldName = key.replace('_not_null', '');
        const finalFieldName = relatedMapping ? (relatedMapping.field || baseFieldName) : baseFieldName;
        const finalAlias = relatedMapping ? relatedMapping.alias : this.alias;
        queryBuilder.andWhere(`${finalAlias}.${finalFieldName} IS NOT NULL`);
        continue;
      }

      // Handle IS NULL
      if (key.endsWith('_is_null')) {
        const baseFieldName = key.replace('_is_null', '');
        const finalFieldName = relatedMapping ? (relatedMapping.field || baseFieldName) : baseFieldName;
        const finalAlias = relatedMapping ? relatedMapping.alias : this.alias;
        queryBuilder.andWhere(`${finalAlias}.${finalFieldName} IS NULL`);
        continue;
      }

      // Handle range filters (FROM)
      if (key.endsWith('_from')) {
        const baseFieldName = key.replace('_from', '');
        const finalFieldName = relatedMapping ? (relatedMapping.field || baseFieldName) : baseFieldName;
        const finalAlias = relatedMapping ? relatedMapping.alias : this.alias;
        queryBuilder.andWhere(`${finalAlias}.${finalFieldName} >= :${key}`, {
          [key]: value,
        });
        continue;
      }

      // Handle range filters (TO)
      if (key.endsWith('_to')) {
        const baseFieldName = key.replace('_to', '');
        const finalFieldName = relatedMapping ? (relatedMapping.field || baseFieldName) : baseFieldName;
        const finalAlias = relatedMapping ? relatedMapping.alias : this.alias;
        queryBuilder.andWhere(`${finalAlias}.${finalFieldName} <= :${key}`, {
          [key]: value,
        });
        continue;
      }

      // Handle IN operator
      if (key.endsWith('_in') && Array.isArray(value)) {
        const baseFieldName = key.replace('_in', '');
        const finalFieldName = relatedMapping ? (relatedMapping.field || baseFieldName) : baseFieldName;
        const finalAlias = relatedMapping ? relatedMapping.alias : this.alias;
        queryBuilder.andWhere(`${finalAlias}.${finalFieldName} IN (:...${key})`, {
          [key]: value,
        });
        continue;
      }

      // Handle LIKE (if value contains % or _)
      if (typeof value === 'string' && (value.includes('%') || value.includes('_'))) {
        queryBuilder.andWhere(`${tableAlias}.${fieldName} LIKE :${key}`, { [key]: value });
        continue;
      }

      // Handle exact match
      queryBuilder.andWhere(`${tableAlias}.${fieldName} = :${key}`, { [key]: value });
    }
  }

  /**
   * Apply sorting to query builder
   * 
   * @param {Object} queryBuilder - TypeORM query builder
   * @param {Object} sorting - Sorting object
   * @param {Object} options - Configuration options
   */
  applySorting(queryBuilder, sorting, options = {}) {
    const { fieldMappings = {} } = options;
    const sortBy = fieldMappings[sorting.sort_by] || sorting.sort_by;
    queryBuilder.orderBy(`${this.alias}.${sortBy}`, sorting.sort_order);
  }

  /**
   * Execute query with pagination
   * 
   * @param {Object} queryBuilder - TypeORM query builder
   * @param {Object} pagination - Pagination object
   * @param {Object} options - Configuration options
   * @param {Boolean} options.loadRelations - Whether to load relations (default: true if joins are used)
   * @returns {Promise<Object>} Query result with data, total, and pagination info
   * 
   * Note: This method uses getMany() which automatically handles relations loaded via leftJoinAndSelect/innerJoinAndSelect
   * This prevents N+1 query problem by loading all related data in a single query.
   */
  async executeQuery(queryBuilder, pagination) {
    // Clone query builder for count (to avoid modifying the original)
    const countQueryBuilder = queryBuilder.clone();
    
    // Get total count before pagination
    // Remove orderBy, skip, take for accurate count
    const total = await countQueryBuilder.getCount();

    // Apply pagination
    const skip = (pagination.page - 1) * pagination.limit;
    queryBuilder.skip(skip).take(pagination.limit);

    // Execute query
    // getMany() will automatically include data from leftJoinAndSelect/innerJoinAndSelect
    // This prevents N+1 by loading all related data in one query
    const data = await queryBuilder.getMany();

    return {
      data,
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

