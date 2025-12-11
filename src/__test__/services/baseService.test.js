const BaseService = require('../../services/baseService');
const { getDataSource } = require('../../db/typeorm/data-source');

// Mock data source
jest.mock('../../db/typeorm/data-source', () => ({
  getDataSource: jest.fn(),
}));

describe('BaseService', () => {
  let baseService;
  let mockRepository;
  let mockQueryBuilder;
  let mockDataSource;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    // Create a test service instance
    baseService = new BaseService('User');
    
    // Reset any cached instances
    baseService.repository = null;
    baseService.dataSource = null;

    // Mock query builder - chainable methods return itself
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      getCount: jest.fn().mockResolvedValue(0),
      select: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
    };

    // Mock repository
    mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    // Mock data source
    mockDataSource = {
      isInitialized: true,
      getRepository: jest.fn().mockReturnValue(mockRepository),
      initialize: jest.fn().mockResolvedValue(undefined),
    };

    getDataSource.mockResolvedValue(mockDataSource);
  });

  describe('camelToSnakeCase', () => {
    it('should convert camelCase to snake_case', () => {
      expect(baseService.camelToSnakeCase('createdAt')).toBe('created_at');
      expect(baseService.camelToSnakeCase('mandaiId')).toBe('mandai_id');
      expect(baseService.camelToSnakeCase('categoryType')).toBe('category_type');
    });

    it('should handle already snake_case strings', () => {
      expect(baseService.camelToSnakeCase('created_at')).toBe('created_at');
    });
  });

  describe('snakeToCamelCase', () => {
    it('should convert snake_case to camelCase', () => {
      expect(baseService.snakeToCamelCase('created_at')).toBe('createdAt');
      expect(baseService.snakeToCamelCase('mandai_id')).toBe('mandaiId');
      expect(baseService.snakeToCamelCase('category_type')).toBe('categoryType');
    });

    it('should handle already camelCase strings', () => {
      expect(baseService.snakeToCamelCase('createdAt')).toBe('createdAt');
    });
  });

  describe('extractOperator', () => {
    it('should extract IsNull operator', () => {
      const result = baseService.extractOperator('mandaiIdIsNull');
      expect(result.baseField).toBe('mandaiId');
      expect(result.operatorSuffix).toBe('_is_null');
    });

    it('should extract NotNull operator', () => {
      const result = baseService.extractOperator('emailNotNull');
      expect(result.baseField).toBe('email');
      expect(result.operatorSuffix).toBe('_not_null');
    });

    it('should extract From operator', () => {
      const result = baseService.extractOperator('createdAtFrom');
      expect(result.baseField).toBe('createdAt');
      expect(result.operatorSuffix).toBe('_from');
    });

    it('should extract To operator', () => {
      const result = baseService.extractOperator('createdAtTo');
      expect(result.baseField).toBe('createdAt');
      expect(result.operatorSuffix).toBe('_to');
    });

    it('should return empty operator for regular fields', () => {
      const result = baseService.extractOperator('email');
      expect(result.baseField).toBe('email');
      expect(result.operatorSuffix).toBe('');
    });
  });

  describe('parseFilters', () => {
    it('should parse simple filter', () => {
      const query = { email: 'test@example.com' };
      const options = {
        allowedFields: ['email'],
      };

      const filters = baseService.parseFilters(query, options);

      expect(filters).toEqual({
        email: 'test@example.com',
      });
    });

    it('should parse multiple filters', () => {
      const query = {
        email: 'test@example.com',
        status: '1',
      };
      const options = {
        allowedFields: ['email', 'status'],
      };

      const filters = baseService.parseFilters(query, options);

      expect(filters).toEqual({
        email: 'test@example.com',
        status: '1',
      });
    });

    it('should parse IsNull filter', () => {
      const query = { mandaiIdIsNull: 'true' };
      const options = {
        allowedFields: ['mandaiIdIsNull'],
      };

      const filters = baseService.parseFilters(query, options);

      expect(filters).toHaveProperty('mandai_id_is_null', true);
    });

    it('should parse NotNull filter', () => {
      const query = { singpassIdNotNull: 'true' };
      const options = {
        allowedFields: ['singpassIdNotNull'],
      };

      const filters = baseService.parseFilters(query, options);

      expect(filters).toHaveProperty('singpass_id_not_null', true);
    });

    it('should parse From date filter', () => {
      const query = { createdAtFrom: '2024-01-01' };
      const options = {
        allowedFields: ['createdAtFrom'],
      };

      const filters = baseService.parseFilters(query, options);

      expect(filters).toHaveProperty('created_at_from');
      expect(new Date(filters.created_at_from)).toBeInstanceOf(Date);
    });

    it('should parse To date filter', () => {
      const query = { createdAtTo: '2024-12-31' };
      const options = {
        allowedFields: ['createdAtTo'],
      };

      const filters = baseService.parseFilters(query, options);

      expect(filters).toHaveProperty('created_at_to');
      expect(new Date(filters.created_at_to)).toBeInstanceOf(Date);
    });

    it('should ignore fields not in allowedFields', () => {
      const query = {
        email: 'test@example.com',
        unauthorizedField: 'value',
      };
      const options = {
        allowedFields: ['email'],
      };

      const filters = baseService.parseFilters(query, options);

      expect(filters).toEqual({
        email: 'test@example.com',
      });
      expect(filters).not.toHaveProperty('unauthorizedField');
    });

    it('should handle IN operator for comma-separated values', () => {
      const query = { status: '1,2,3' };
      const options = {
        allowedFields: ['status'],
      };

      const filters = baseService.parseFilters(query, options);

      expect(filters).toEqual({
        status_in: ['1', '2', '3'],
      });
    });

    describe('Comparison operators in parseFilters', () => {
      it('should parse gt operator', () => {
        const query = { 'status[gt]': '1' };
        const options = {
          allowedFields: ['status'],
        };

        const filters = baseService.parseFilters(query, options);

        expect(filters).toHaveProperty('status_gt', '1');
      });

      it('should parse lt operator', () => {
        const query = { 'status[lt]': '5' };
        const options = {
          allowedFields: ['status'],
        };

        const filters = baseService.parseFilters(query, options);

        expect(filters).toHaveProperty('status_lt', '5');
      });

      it('should parse gte operator', () => {
        const query = { 'status[gte]': '1' };
        const options = {
          allowedFields: ['status'],
        };

        const filters = baseService.parseFilters(query, options);

        expect(filters).toHaveProperty('status_gte', '1');
      });

      it('should parse lte operator', () => {
        const query = { 'status[lte]': '10' };
        const options = {
          allowedFields: ['status'],
        };

        const filters = baseService.parseFilters(query, options);

        expect(filters).toHaveProperty('status_lte', '10');
      });

      it('should parse eq operator', () => {
        const query = { 'status[eq]': '1' };
        const options = {
          allowedFields: ['status'],
        };

        const filters = baseService.parseFilters(query, options);

        expect(filters).toHaveProperty('status_eq', '1');
      });

      it('should parse ne operator', () => {
        const query = { 'status[ne]': '0' };
        const options = {
          allowedFields: ['status'],
        };

        const filters = baseService.parseFilters(query, options);

        expect(filters).toHaveProperty('status_ne', '0');
      });

      it('should parse related field with operator (orders.total_amount[gt])', () => {
        const query = { 'orders.total_amount[gt]': '100' };
        const options = {
          allowedFields: ['totalAmount'],
        };

        const filters = baseService.parseFilters(query, options);

        // Use bracket notation for dot-separated keys
        expect(filters['orders.total_amount_gt']).toBe('100');
      });

      it('should parse related field with camelCase field name', () => {
        const query = { 'orders.totalAmount[gte]': '50' };
        const options = {
          allowedFields: ['totalAmount'],
        };

        const filters = baseService.parseFilters(query, options);

        // Use bracket notation for dot-separated keys
        expect(filters['orders.total_amount_gte']).toBe('50');
      });

      it('should ignore comparison operator if field not in allowedFields', () => {
        const query = {
          'status[gt]': '1',
          'unauthorized[lt]': '10',
        };
        const options = {
          allowedFields: ['status'],
        };

        const filters = baseService.parseFilters(query, options);

        expect(filters).toHaveProperty('status_gt', '1');
        expect(filters).not.toHaveProperty('unauthorized_lt');
      });

      it('should handle multiple comparison operators', () => {
        const query = {
          'status[gte]': '1',
          'status[lte]': '10',
        };
        const options = {
          allowedFields: ['status'],
        };

        const filters = baseService.parseFilters(query, options);

        expect(filters).toHaveProperty('status_gte', '1');
        expect(filters).toHaveProperty('status_lte', '10');
      });
    });

    describe('IsNull, NotNull and Date Range operators for related fields in parseFilters', () => {
      it('should parse related field IsNull (membershipDetails.validFromIsNull)', () => {
        const query = { 'membershipDetails.validFromIsNull': 'true' };
        const options = {
          allowedFields: ['validFrom'],
        };

        const filters = baseService.parseFilters(query, options);

        expect(filters['membershipDetails.valid_from_is_null']).toBe(true);
      });

      it('should parse related field NotNull (membershipDetails.validFromNotNull)', () => {
        const query = { 'membershipDetails.validFromNotNull': 'true' };
        const options = {
          allowedFields: ['validFrom'],
        };

        const filters = baseService.parseFilters(query, options);

        expect(filters['membershipDetails.valid_from_not_null']).toBe(true);
      });

      it('should parse related field NotNull with camelCase (membershipDetails.validUntilNotNull)', () => {
        const query = { 'membershipDetails.validUntilNotNull': 'true' };
        const options = {
          allowedFields: ['validUntil'],
        };

        const filters = baseService.parseFilters(query, options);

        expect(filters['membershipDetails.valid_until_not_null']).toBe(true);
      });

      it('should ignore related field NotNull if field not in allowedFields', () => {
        const query = { 'membershipDetails.unauthorizedNotNull': 'true' };
        const options = {
          allowedFields: ['validFrom'],
        };

        const filters = baseService.parseFilters(query, options);

        expect(filters['membershipDetails.unauthorized_not_null']).toBeUndefined();
      });

      it('should parse related field IsNull with camelCase (membershipDetails.validUntilIsNull)', () => {
        const query = { 'membershipDetails.validUntilIsNull': 'true' };
        const options = {
          allowedFields: ['validUntil'],
        };

        const filters = baseService.parseFilters(query, options);

        expect(filters['membershipDetails.valid_until_is_null']).toBe(true);
      });

      it('should parse related field From (membershipDetails.validFromFrom)', () => {
        const query = { 'membershipDetails.validFromFrom': '2024-01-01' };
        const options = {
          allowedFields: ['validFrom'],
        };

        const filters = baseService.parseFilters(query, options);

        expect(filters['membershipDetails.valid_from_from']).toBeDefined();
        expect(new Date(filters['membershipDetails.valid_from_from'])).toBeInstanceOf(Date);
      });

      it('should parse related field To (membershipDetails.validFromTo)', () => {
        const query = { 'membershipDetails.validFromTo': '2024-12-31' };
        const options = {
          allowedFields: ['validFrom'],
        };

        const filters = baseService.parseFilters(query, options);

        expect(filters['membershipDetails.valid_from_to']).toBeDefined();
        expect(new Date(filters['membershipDetails.valid_from_to'])).toBeInstanceOf(Date);
      });

      it('should parse related field From with camelCase (membershipDetails.validUntilFrom)', () => {
        const query = { 'membershipDetails.validUntilFrom': '2024-01-01' };
        const options = {
          allowedFields: ['validUntil'],
        };

        const filters = baseService.parseFilters(query, options);

        expect(filters['membershipDetails.valid_until_from']).toBeDefined();
        expect(new Date(filters['membershipDetails.valid_until_from'])).toBeInstanceOf(Date);
      });

      it('should parse related field To with camelCase (membershipDetails.validUntilTo)', () => {
        const query = { 'membershipDetails.validUntilTo': '2024-12-31' };
        const options = {
          allowedFields: ['validUntil'],
        };

        const filters = baseService.parseFilters(query, options);

        expect(filters['membershipDetails.valid_until_to']).toBeDefined();
        expect(new Date(filters['membershipDetails.valid_until_to'])).toBeInstanceOf(Date);
      });

      it('should ignore related field IsNull if field not in allowedFields', () => {
        const query = { 'membershipDetails.unauthorizedIsNull': 'true' };
        const options = {
          allowedFields: ['validFrom'],
        };

        const filters = baseService.parseFilters(query, options);

        expect(filters['membershipDetails.unauthorized_is_null']).toBeUndefined();
      });

      it('should ignore related field From if field not in allowedFields', () => {
        const query = { 'membershipDetails.unauthorizedFrom': '2024-01-01' };
        const options = {
          allowedFields: ['validFrom'],
        };

        const filters = baseService.parseFilters(query, options);

        expect(filters['membershipDetails.unauthorized_from']).toBeUndefined();
      });

      it('should handle multiple related field operators', () => {
        const query = {
          'membershipDetails.validFromIsNull': 'true',
          'membershipDetails.validUntilNotNull': 'true',
          'membershipDetails.validUntilFrom': '2024-01-01',
          'membershipDetails.validUntilTo': '2024-12-31',
        };
        const options = {
          allowedFields: ['validFrom', 'validUntil'],
        };

        const filters = baseService.parseFilters(query, options);

        expect(filters['membershipDetails.valid_from_is_null']).toBe(true);
        expect(filters['membershipDetails.valid_until_not_null']).toBe(true);
        expect(filters['membershipDetails.valid_until_from']).toBeDefined();
        expect(filters['membershipDetails.valid_until_to']).toBeDefined();
      });
    });
  });

  describe('parsePagination', () => {
    it('should parse pagination parameters', () => {
      const query = { page: '2', limit: '10' };
      const options = {
        defaultPage: 1,
        defaultLimit: 50,
        maxLimit: 250,
      };

      const pagination = baseService.parsePagination(query, options);

      expect(pagination).toEqual({
        page: 2,
        limit: 10,
      });
    });

    it('should use default values when not provided', () => {
      const query = {};
      const options = {
        defaultPage: 1,
        defaultLimit: 50,
        maxLimit: 250,
      };

      const pagination = baseService.parsePagination(query, options);

      expect(pagination).toEqual({
        page: 1,
        limit: 50,
      });
    });

    it('should enforce maxLimit', () => {
      const query = { limit: '500' };
      const options = {
        defaultPage: 1,
        defaultLimit: 50,
        maxLimit: 250,
      };

      const pagination = baseService.parsePagination(query, options);

      expect(pagination).toEqual({
        page: 1,
        limit: 250, // Capped at maxLimit
      });
    });

    it('should enforce minimum page of 1', () => {
      const query = { page: '0' };
      const options = {
        defaultPage: 1,
        defaultLimit: 50,
        maxLimit: 250,
      };

      const pagination = baseService.parsePagination(query, options);

      expect(pagination.page).toBe(1);
    });
  });

  describe('parseSorting', () => {
    it('should parse sorting parameters with camelCase (sortBy/sortOrder)', () => {
      const query = { sortBy: 'email', sortOrder: 'DESC' };
      const options = {
        defaultSortBy: 'createdAt',
        defaultSortOrder: 'DESC',
        allowedSortFields: ['email', 'createdAt'],
      };

      const sorting = baseService.parseSorting(query, options);

      expect(sorting).toEqual({
        sort_by: 'email', // Converted to snake_case
        sort_order: 'DESC',
      });
    });

    it('should parse sorting parameters with snake_case (sort_by/sort_order)', () => {
      const query = { sort_by: 'email', sort_order: 'DESC' };
      const options = {
        defaultSortBy: 'createdAt',
        defaultSortOrder: 'DESC',
        allowedSortFields: ['email', 'createdAt'],
      };

      const sorting = baseService.parseSorting(query, options);

      expect(sorting).toEqual({
        sort_by: 'email', // Converted to snake_case
        sort_order: 'DESC',
      });
    });

    it('should prefer camelCase over snake_case when both are provided', () => {
      const query = { sortBy: 'email', sort_by: 'createdAt', sortOrder: 'ASC', sort_order: 'DESC' };
      const options = {
        defaultSortBy: 'createdAt',
        defaultSortOrder: 'DESC',
        allowedSortFields: ['email', 'createdAt'],
      };

      const sorting = baseService.parseSorting(query, options);

      // camelCase should be preferred
      expect(sorting).toEqual({
        sort_by: 'email',
        sort_order: 'ASC',
      });
    });

    it('should use default sorting when not provided', () => {
      const query = {};
      const options = {
        defaultSortBy: 'createdAt',
        defaultSortOrder: 'DESC',
        allowedSortFields: ['email', 'createdAt'],
      };

      const sorting = baseService.parseSorting(query, options);

      expect(sorting).toEqual({
        sort_by: 'created_at', // Default converted to snake_case
        sort_order: 'DESC',
      });
    });

    it('should ignore unauthorized sort fields', () => {
      const query = { sortBy: 'unauthorizedField' };
      const options = {
        defaultSortBy: 'createdAt',
        defaultSortOrder: 'DESC',
        allowedSortFields: ['email', 'createdAt'],
      };

      const sorting = baseService.parseSorting(query, options);

      expect(sorting.sort_by).toBe('created_at'); // Falls back to default (converted to snake_case)
      expect(sorting.sort_order).toBe('DESC');
    });
  });

  describe('applyJoins', () => {
    it('should apply leftJoin', () => {
      const joins = [
        {
          type: 'leftJoin',
          entity: 'user_membership_details',
          alias: 'membershipDetails',
          condition: 'user.id = membershipDetails.user_id',
        },
      ];

      baseService.applyJoins(mockQueryBuilder, joins);

      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'user_membership_details',
        'membershipDetails',
        'user.id = membershipDetails.user_id',
      );
    });

    it('should apply leftJoinAndSelect', () => {
      const joins = [
        {
          type: 'leftJoinAndSelect',
          entity: 'user_membership_details',
          alias: 'membershipDetails',
          condition: 'user.id = membershipDetails.user_id',
        },
      ];

      baseService.applyJoins(mockQueryBuilder, joins);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'user_membership_details',
        'membershipDetails',
        'user.id = membershipDetails.user_id',
      );
    });

    it('should add selectFields for leftJoin with GROUP_CONCAT', () => {
      const joins = [
        {
          type: 'leftJoin',
          entity: 'user_membership_details',
          alias: 'membershipDetails',
          condition: 'user.id = membershipDetails.user_id',
          selectFields: ['id', 'category_type'],
        },
      ];

      baseService.applyJoins(mockQueryBuilder, joins);

      expect(mockQueryBuilder.leftJoin).toHaveBeenCalled();
      // GROUP_CONCAT is used to aggregate multiple related records when GROUP BY is applied
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        "GROUP_CONCAT(DISTINCT membershipDetails.id ORDER BY membershipDetails.id SEPARATOR '|||')",
        'membershipDetails_id',
      );
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        "GROUP_CONCAT(DISTINCT membershipDetails.category_type ORDER BY membershipDetails.category_type SEPARATOR '|||')",
        'membershipDetails_category_type',
      );
    });
  });

  describe('applyFilters', () => {
    beforeEach(() => {
      mockQueryBuilder.andWhere.mockClear();
    });

    it('should use exact match (=) for values without wildcards', () => {
      const filters = {
        email: 'john_doe@example.com',
      };

      baseService.applyFilters(mockQueryBuilder, filters, {});

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.email = :email',
        { email: 'john_doe@example.com' },
      );
    });

    it('should use LIKE for values with % wildcard', () => {
      const filters = {
        email: '%example.com',
      };

      baseService.applyFilters(mockQueryBuilder, filters, {});

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.email LIKE :email',
        { email: '%example.com' },
      );
    });

    it('should use exact match for values with underscore but no %', () => {
      const filters = {
        email: 'test_user@example.com',
        mandai_id: 'TEST_123',
      };

      baseService.applyFilters(mockQueryBuilder, filters, {});

      // Both should use exact match, not LIKE
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.email = :email',
        { email: 'test_user@example.com' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.mandai_id = :mandai_id',
        { mandai_id: 'TEST_123' },
      );
    });

    it('should use LIKE when % is present even with underscore', () => {
      const filters = {
        email: 'john_%@example.com',
      };

      baseService.applyFilters(mockQueryBuilder, filters, {});

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.email LIKE :email',
        { email: 'john_%@example.com' },
      );
    });

    it('should use exact match for numeric values', () => {
      const filters = {
        status: 1,
      };

      baseService.applyFilters(mockQueryBuilder, filters, {});

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.status = :status',
        { status: 1 },
      );
    });

    describe('Comparison operators', () => {
      it('should apply gt operator with numeric value', () => {
        const filters = {
          status_gt: '5',
        };

        baseService.applyFilters(mockQueryBuilder, filters, {});

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'user.status > :status_gt',
          { status_gt: 5 },
        );
      });

      it('should apply lt operator with numeric value', () => {
        const filters = {
          status_lt: '10',
        };

        baseService.applyFilters(mockQueryBuilder, filters, {});

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'user.status < :status_lt',
          { status_lt: 10 },
        );
      });

      it('should apply gte operator with numeric value', () => {
        const filters = {
          status_gte: '1',
        };

        baseService.applyFilters(mockQueryBuilder, filters, {});

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'user.status >= :status_gte',
          { status_gte: 1 },
        );
      });

      it('should apply lte operator with numeric value', () => {
        const filters = {
          status_lte: '100',
        };

        baseService.applyFilters(mockQueryBuilder, filters, {});

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'user.status <= :status_lte',
          { status_lte: 100 },
        );
      });

      it('should apply eq operator', () => {
        const filters = {
          status_eq: '1',
        };

        baseService.applyFilters(mockQueryBuilder, filters, {});

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'user.status = :status_eq',
          { status_eq: '1' },
        );
      });

      it('should apply ne operator', () => {
        const filters = {
          status_ne: '0',
        };

        baseService.applyFilters(mockQueryBuilder, filters, {});

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'user.status != :status_ne',
          { status_ne: '0' },
        );
      });

      it('should ignore invalid numeric values for gt operator', () => {
        const filters = {
          status_gt: 'invalid',
        };

        baseService.applyFilters(mockQueryBuilder, filters, {});

        // Should not call andWhere for invalid numeric value
        expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
          expect.stringContaining('status_gt'),
          expect.anything(),
        );
      });

      it('should apply gt operator with related field mapping', () => {
        const filters = {
          'orders.total_amount_gt': '100',
        };

        const options = {
          relatedFieldMappings: {
            totalAmount: {
              alias: 'orders',
              field: 'total_amount',
            },
          },
        };

        baseService.applyFilters(mockQueryBuilder, filters, options);

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'orders.total_amount > :orders.total_amount_gt',
          { 'orders.total_amount_gt': 100 },
        );
      });

      it('should apply gt operator with related field without mapping (using table name as alias)', () => {
        const filters = {
          'orders.total_amount_gt': '100',
        };

        baseService.applyFilters(mockQueryBuilder, filters, {});

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'orders.total_amount > :orders.total_amount_gt',
          { 'orders.total_amount_gt': 100 },
        );
      });

      it('should handle multiple comparison operators', () => {
        const filters = {
          status_gte: '1',
          status_lte: '10',
        };

        baseService.applyFilters(mockQueryBuilder, filters, {});

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'user.status >= :status_gte',
          { status_gte: 1 },
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'user.status <= :status_lte',
          { status_lte: 10 },
        );
      });

      it('should handle comparison operator with decimal value', () => {
        const filters = {
          price_gt: '99.99',
        };

        baseService.applyFilters(mockQueryBuilder, filters, {});

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'user.price > :price_gt',
          { price_gt: 99.99 },
        );
      });

      it('should handle comparison operator with negative value', () => {
        const filters = {
          balance_gt: '-100',
        };

        baseService.applyFilters(mockQueryBuilder, filters, {});

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'user.balance > :balance_gt',
          { balance_gt: -100 },
        );
      });
    });

    describe('IsNull, NotNull and Date Range operators in applyFilters', () => {
      it('should apply IsNull filter for main field', () => {
        const filters = {
          singpass_id_is_null: true,
        };

        baseService.applyFilters(mockQueryBuilder, filters, {});

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'user.singpass_id IS NULL',
        );
      });

      it('should apply NotNull filter for main field', () => {
        const filters = {
          singpass_id_not_null: true,
        };

        baseService.applyFilters(mockQueryBuilder, filters, {});

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'user.singpass_id IS NOT NULL',
        );
      });

      it('should apply NotNull filter for related field with mapping', () => {
        const filters = {
          'membershipDetails.valid_from_not_null': true,
        };

        const options = {
          relatedFieldMappings: {
            validFrom: {
              alias: 'membershipDetails',
              field: 'valid_from',
            },
          },
        };

        baseService.applyFilters(mockQueryBuilder, filters, options);

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'membershipDetails.valid_from IS NOT NULL',
        );
      });

      it('should apply NotNull filter for related field without mapping', () => {
        const filters = {
          'membershipDetails.valid_from_not_null': true,
        };

        baseService.applyFilters(mockQueryBuilder, filters, {});

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'membershipDetails.valid_from IS NOT NULL',
        );
      });

      it('should apply IsNull filter for related field with mapping', () => {
        const filters = {
          'membershipDetails.valid_from_is_null': true,
        };

        const options = {
          relatedFieldMappings: {
            validFrom: {
              alias: 'membershipDetails',
              field: 'valid_from',
            },
          },
        };

        baseService.applyFilters(mockQueryBuilder, filters, options);

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'membershipDetails.valid_from IS NULL',
        );
      });

      it('should apply IsNull filter for related field without mapping', () => {
        const filters = {
          'membershipDetails.valid_from_is_null': true,
        };

        baseService.applyFilters(mockQueryBuilder, filters, {});

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'membershipDetails.valid_from IS NULL',
        );
      });

      it('should apply From filter for main field', () => {
        const filters = {
          created_at_from: '2024-01-01T00:00:00.000Z',
        };

        baseService.applyFilters(mockQueryBuilder, filters, {});

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'user.created_at >= :created_at_from',
          { created_at_from: '2024-01-01T00:00:00.000Z' },
        );
      });

      it('should apply From filter for related field with mapping', () => {
        const filters = {
          'membershipDetails.valid_from_from': '2024-01-01T00:00:00.000Z',
        };

        const options = {
          relatedFieldMappings: {
            validFrom: {
              alias: 'membershipDetails',
              field: 'valid_from',
            },
          },
        };

        baseService.applyFilters(mockQueryBuilder, filters, options);

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'membershipDetails.valid_from >= :membershipDetails.valid_from_from',
          { 'membershipDetails.valid_from_from': '2024-01-01T00:00:00.000Z' },
        );
      });

      it('should apply From filter for related field without mapping', () => {
        const filters = {
          'membershipDetails.valid_from_from': '2024-01-01T00:00:00.000Z',
        };

        baseService.applyFilters(mockQueryBuilder, filters, {});

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'membershipDetails.valid_from >= :membershipDetails.valid_from_from',
          { 'membershipDetails.valid_from_from': '2024-01-01T00:00:00.000Z' },
        );
      });

      it('should apply To filter for main field', () => {
        const filters = {
          created_at_to: '2024-12-31T23:59:59.999Z',
        };

        baseService.applyFilters(mockQueryBuilder, filters, {});

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'user.created_at <= :created_at_to',
          { created_at_to: '2024-12-31T23:59:59.999Z' },
        );
      });

      it('should apply To filter for related field with mapping', () => {
        const filters = {
          'membershipDetails.valid_until_to': '2024-12-31T23:59:59.999Z',
        };

        const options = {
          relatedFieldMappings: {
            validUntil: {
              alias: 'membershipDetails',
              field: 'valid_until',
            },
          },
        };

        baseService.applyFilters(mockQueryBuilder, filters, options);

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'membershipDetails.valid_until <= :membershipDetails.valid_until_to',
          { 'membershipDetails.valid_until_to': '2024-12-31T23:59:59.999Z' },
        );
      });

      it('should apply To filter for related field without mapping', () => {
        const filters = {
          'membershipDetails.valid_until_to': '2024-12-31T23:59:59.999Z',
        };

        baseService.applyFilters(mockQueryBuilder, filters, {});

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'membershipDetails.valid_until <= :membershipDetails.valid_until_to',
          { 'membershipDetails.valid_until_to': '2024-12-31T23:59:59.999Z' },
        );
      });

      it('should handle multiple IsNull, NotNull and date range filters', () => {
        const filters = {
          singpass_id_is_null: true,
          singpass_id_not_null: true,
          'membershipDetails.valid_from_is_null': true,
          'membershipDetails.valid_until_not_null': true,
          'membershipDetails.valid_until_from': '2024-01-01T00:00:00.000Z',
          'membershipDetails.valid_until_to': '2024-12-31T23:59:59.999Z',
        };

        const options = {
          relatedFieldMappings: {
            validFrom: {
              alias: 'membershipDetails',
              field: 'valid_from',
            },
            validUntil: {
              alias: 'membershipDetails',
              field: 'valid_until',
            },
          },
        };

        baseService.applyFilters(mockQueryBuilder, filters, options);

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'user.singpass_id IS NULL',
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'user.singpass_id IS NOT NULL',
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'membershipDetails.valid_from IS NULL',
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'membershipDetails.valid_until IS NOT NULL',
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'membershipDetails.valid_until >= :membershipDetails.valid_until_from',
          { 'membershipDetails.valid_until_from': '2024-01-01T00:00:00.000Z' },
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'membershipDetails.valid_until <= :membershipDetails.valid_until_to',
          { 'membershipDetails.valid_until_to': '2024-12-31T23:59:59.999Z' },
        );
      });
    });
  });

  describe('formatDataWithRelatedFields', () => {
    it('should format flat data with related fields grouped', () => {
      const rawData = [
        {
          user_id: 1,
          user_email: 'test@example.com',
          membershipDetails_id: 10,
          membershipDetails_category_type: 'FOM',
        },
      ];

      const joins = [
        {
          alias: 'membershipDetails',
          selectFields: ['id', 'category_type'],
        },
      ];

      const formatted = baseService.formatDataWithRelatedFields(rawData, joins);

      expect(formatted).toEqual([
        {
          id: 1,
          email: 'test@example.com',
          membershipDetails: {
            id: 10,
            category_type: 'FOM',
          },
        },
      ]);
    });

    it('should handle data without related fields', () => {
      const rawData = [
        {
          user_id: 1,
          user_email: 'test@example.com',
        },
      ];

      const formatted = baseService.formatDataWithRelatedFields(rawData, []);

      expect(formatted).toEqual([
        {
          id: 1,
          email: 'test@example.com',
        },
      ]);
    });

    it('should not include related fields if all values are null', () => {
      const rawData = [
        {
          user_id: 1,
          user_email: 'test@example.com',
          membershipDetails_id: null,
          membershipDetails_category_type: null,
        },
      ];

      const joins = [
        {
          alias: 'membershipDetails',
          selectFields: ['id', 'category_type'],
        },
      ];

      const formatted = baseService.formatDataWithRelatedFields(rawData, joins);

      expect(formatted).toEqual([
        {
          id: 1,
          email: 'test@example.com',
          // membershipDetails should not be included
        },
      ]);
      expect(formatted[0]).not.toHaveProperty('membershipDetails');
    });
  });

  describe('buildQuery', () => {
    beforeEach(async () => {
      // Setup repository mock
      baseService.getRepository = jest.fn().mockResolvedValue(mockRepository);
    });

    it('should build query with filters', async () => {
      const req = {
        query: { email: 'test@example.com' },
      };

      const options = {
        allowedFields: ['email'],
        defaultPage: 1,
        defaultLimit: 50,
        defaultSortBy: 'createdAt',
        defaultSortOrder: 'DESC',
        allowedSortFields: ['createdAt'],
      };

      const result = await baseService.buildQuery(req, options);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(result).toHaveProperty('queryBuilder');
      expect(result).toHaveProperty('filters');
      expect(result).toHaveProperty('pagination');
      expect(result).toHaveProperty('sorting');
      expect(result.filters).toHaveProperty('email', 'test@example.com');
    });

    it('should build query with joins', async () => {
      const req = { query: { categoryType: 'FOM' } };

      const options = {
        allowedFields: ['categoryType'],
        joins: [
          {
            type: 'leftJoin',
            entity: 'user_membership_details',
            alias: 'membershipDetails',
            condition: 'user.id = membershipDetails.user_id',
            selectFields: ['id', 'category_type'],
          },
        ],
        relatedFieldMappings: {
          categoryType: {
            alias: 'membershipDetails',
            field: 'category_type',
          },
        },
      };

      const result = await baseService.buildQuery(req, options);

      expect(mockQueryBuilder.leftJoin).toHaveBeenCalled();
      expect(result).toHaveProperty('queryBuilder');
    });
  });

  describe('executeQuery', () => {
    beforeEach(async () => {
      baseService.getRepository = jest.fn().mockResolvedValue(mockRepository);
    });

    it('should execute query and return formatted data', async () => {
      const mockRawData = [
        {
          user_id: 1,
          user_email: 'test@example.com',
        },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockRawData);
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.clone.mockReturnValue(mockQueryBuilder);

      const pagination = { page: 1, limit: 50 };
      const options = {
        joins: [],
      };

      const result = await baseService.executeQuery(mockQueryBuilder, pagination, options);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
      expect(mockQueryBuilder.getRawMany).toHaveBeenCalled();
      expect(mockQueryBuilder.groupBy).not.toHaveBeenCalled(); // No joins, no groupBy
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 50);
      expect(result).toHaveProperty('totalPages', 1);
    });

    it('should calculate pagination correctly', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(100);
      mockQueryBuilder.clone.mockReturnValue(mockQueryBuilder);

      const pagination = { page: 2, limit: 10 };
      const options = { joins: [] };

      const result = await baseService.executeQuery(mockQueryBuilder, pagination, options);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10); // (page - 1) * limit
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result.totalPages).toBe(10); // Math.ceil(100 / 10)
    });

    it('should use COUNT(DISTINCT) to count distinct users when joins exist', async () => {
      const mockRawData = [
        {
          user_id: 1,
          user_email: 'test@example.com',
          membershipDetails_id: 10,
          membershipDetails_category_type: 'FOM',
        },
      ];

      // Mock count result from COUNT(DISTINCT user.id)
      const mockCountResult = { total: '1' };
      mockQueryBuilder.getRawOne.mockResolvedValueOnce(mockCountResult); // For count
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRawData); // For data

      mockQueryBuilder.clone.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.addSelect.mockReturnThis();

      const pagination = { page: 1, limit: 50 };
      const options = {
        joins: [
          {
            alias: 'membershipDetails',
            selectFields: ['id', 'category_type'],
          },
        ],
      };

      const result = await baseService.executeQuery(mockQueryBuilder, pagination, options);

      // Should use COUNT(DISTINCT) for efficient counting at database level
      expect(mockQueryBuilder.select).toHaveBeenCalledWith([]);
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        `COUNT(DISTINCT ${baseService.alias}.id)`,
        'total'
      );
      expect(mockQueryBuilder.getRawOne).toHaveBeenCalled(); // For count
      // Main query still uses GROUP BY to avoid duplicate users
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith(`${baseService.alias}.id`);
      expect(result).toHaveProperty('total', 1); // Count from COUNT(DISTINCT)
      expect(result.data).toEqual([
        {
          id: 1,
          email: 'test@example.com',
          membershipDetails: {
            id: 10,
            category_type: 'FOM',
          },
        },
      ]);
    });

    it('should format data with related fields when joins exist', async () => {
      const mockRawData = [
        {
          user_id: 1,
          user_email: 'test@example.com',
          // GROUP_CONCAT returns single value (no separator) when only one record
          membershipDetails_id: '10',
          membershipDetails_category_type: 'FOM',
        },
      ];

      // Mock count result from COUNT(DISTINCT user.id)
      const mockCountResult = { total: '1' };
      mockQueryBuilder.getRawOne.mockResolvedValueOnce(mockCountResult); // For count
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRawData); // For data

      mockQueryBuilder.clone.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.addSelect.mockReturnThis();

      const pagination = { page: 1, limit: 50 };
      const options = {
        joins: [
          {
            alias: 'membershipDetails',
            selectFields: ['id', 'category_type'],
          },
        ],
      };

      const result = await baseService.executeQuery(mockQueryBuilder, pagination, options);

      expect(result.data).toEqual([
        {
          id: 1,
          email: 'test@example.com',
          membershipDetails: {
            id: '10',
            category_type: 'FOM',
          },
        },
      ]);
    });

    it('should handle multiple users with joins correctly', async () => {
      // Simulate 2 users, but one has 2 membership details (would return 3 rows without GROUP BY)
      const mockRawData = [
        {
          user_id: 1,
          user_email: 'user1@example.com',
          // GROUP_CONCAT returns single value when only one record
          membershipDetails_id: '10',
          membershipDetails_category_type: 'FOM',
        },
        {
          user_id: 2,
          user_email: 'user2@example.com',
          membershipDetails_id: '20',
          membershipDetails_category_type: 'WILDPASS',
        },
      ];

      // Mock count result from COUNT(DISTINCT user.id) - 2 distinct users
      const mockCountResult = { total: '2' };
      mockQueryBuilder.getRawOne.mockResolvedValueOnce(mockCountResult); // For count
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRawData); // For data

      mockQueryBuilder.clone.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.addSelect.mockReturnThis();

      const pagination = { page: 1, limit: 50 };
      const options = {
        joins: [
          {
            alias: 'membershipDetails',
            selectFields: ['id', 'category_type'],
          },
        ],
      };

      const result = await baseService.executeQuery(mockQueryBuilder, pagination, options);

      // Should count 2 distinct users (from COUNT(DISTINCT)), not 3 rows
      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      // Main query still uses GROUP BY to avoid duplicate users
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith(`${baseService.alias}.id`);
    });

    it('should handle user with multiple membership details using GROUP_CONCAT', async () => {
      // Simulate user with 2 membership details - GROUP_CONCAT will aggregate them
      const mockRawData = [
        {
          user_id: 1,
          user_email: 'user1@example.com',
          // GROUP_CONCAT returns multiple values separated by '|||'
          membershipDetails_id: '10|||11',
          membershipDetails_category_type: 'FOM|||JUNIOR',
        },
      ];

      // Mock count result from COUNT(DISTINCT user.id) - 1 distinct user
      const mockCountResult = { total: '1' };
      mockQueryBuilder.getRawOne.mockResolvedValueOnce(mockCountResult); // For count
      mockQueryBuilder.getRawMany.mockResolvedValueOnce(mockRawData); // For data

      mockQueryBuilder.clone.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.addSelect.mockReturnThis();

      const pagination = { page: 1, limit: 50 };
      const options = {
        joins: [
          {
            alias: 'membershipDetails',
            selectFields: ['id', 'category_type'],
          },
        ],
      };

      const result = await baseService.executeQuery(mockQueryBuilder, pagination, options);

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      
      // Should parse GROUP_CONCAT into array and create array of objects
      expect(result.data[0]).toHaveProperty('id', 1);
      expect(result.data[0]).toHaveProperty('email', 'user1@example.com');
      expect(result.data[0]).toHaveProperty('membershipDetails');
      
      // When multiple values, should return as array
      expect(Array.isArray(result.data[0].membershipDetails)).toBe(true);
      expect(result.data[0].membershipDetails).toHaveLength(2);
      expect(result.data[0].membershipDetails[0]).toEqual({
        id: '10',
        category_type: 'FOM',
      });
      expect(result.data[0].membershipDetails[1]).toEqual({
        id: '11',
        category_type: 'JUNIOR',
      });
    });
  });

  describe('getRepository', () => {
    it('should get repository and cache it', async () => {
      const repo1 = await baseService.getRepository();
      const repo2 = await baseService.getRepository();

      expect(getDataSource).toHaveBeenCalledTimes(1); // Only called once
      expect(mockDataSource.getRepository).toHaveBeenCalledWith('User');
      expect(repo1).toBe(repo2); // Same instance (cached)
    });

    it('should initialize dataSource if not initialized', async () => {
      mockDataSource.isInitialized = false;

      await baseService.getRepository();

      expect(mockDataSource.initialize).toHaveBeenCalled();
    });

    it('should handle dataSource initialization error', async () => {
      getDataSource.mockRejectedValue(new Error('Connection failed'));

      await expect(baseService.getRepository()).rejects.toThrow(
        'Failed to initialize dataSource for User: Connection failed',
      );
    });
  });

  afterEach(() => {
    // Cleanup after each test
    if (baseService) {
      baseService.repository = null;
      baseService.dataSource = null;
    }
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Final cleanup
    if (baseService) {
      baseService.repository = null;
      baseService.dataSource = null;
    }
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset mock implementations
    getDataSource.mockReset();
    
    // Give a small delay to allow any pending async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
});
