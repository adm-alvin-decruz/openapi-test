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

    baseService = new BaseService('User');
    baseService.repository = null;
    baseService.dataSource = null;

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
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      getCount: jest.fn().mockResolvedValue(0),
      select: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
    };

    mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

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

  describe('parseFilters - Nested Format', () => {
    it('should parse simple eq operator', () => {
      const query = {
        field: { eq: 10 }
      };
      const options = {
        allowedFields: ['field'],
      };

      const filters = baseService.parseFilters(query, options);

      expect(filters).toEqual({
        field: [{ operator: 'eq', value: 10 }]
      });
    });

    it('should parse is_null operator', () => {
      const query = {
        field: { is_null: true }
      };
      const options = {
        allowedFields: ['field'],
      };

      const filters = baseService.parseFilters(query, options);

      expect(filters).toEqual({
        field: [{ operator: 'is_null', value: null }]
      });
    });

    it('should parse not_null operator', () => {
      const query = {
        field: { not_null: true }
      };
      const options = {
        allowedFields: ['field'],
      };

      const filters = baseService.parseFilters(query, options);

      expect(filters).toEqual({
        field: [{ operator: 'not_null', value: null }]
      });
    });

    it('should parse comparison operators (gt, lt, gte, lte)', () => {
      const query = {
        age: { gt: 18, lte: 65 }
      };
      const options = {
        allowedFields: ['age'],
      };

      const filters = baseService.parseFilters(query, options);

      expect(filters).toEqual({
        age: [
          { operator: 'gt', value: 18 },
          { operator: 'lte', value: 65 }
        ]
      });
    });

    it('should parse in operator with array', () => {
      const query = {
        status: { in: ['active', 'pending'] }
      };
      const options = {
        allowedFields: ['status'],
      };

      const filters = baseService.parseFilters(query, options);

      expect(filters).toEqual({
        status: [{ operator: 'in', value: ['active', 'pending'] }]
      });
    });

    it('should parse like operator', () => {
      const query = {
        name: { like: '%John%' }
      };
        const options = {
        allowedFields: ['name'],
        };

        const filters = baseService.parseFilters(query, options);

      expect(filters).toEqual({
        name: [{ operator: 'like', value: '%John%' }]
      });
      });

    it('should parse related fields with nested structure', () => {
        const query = { 
        memberShipDetails: {
          category_type: { eq: 'FOW' }
          } 
        };
        const options = {
        allowedFields: ['category_type'],
        };

        const filters = baseService.parseFilters(query, options);

      expect(filters).toEqual({
        memberShipDetails: {
          category_type: [{ operator: 'eq', value: 'FOW' }]
        }
      });
      });

    it('should convert camelCase to snake_case', () => {
        const query = {
        createdAt: { gte: '2024-01-01' }
        };
        const options = {
        allowedFields: ['createdAt'],
        };

        const filters = baseService.parseFilters(query, options);

      expect(filters).toEqual({
        created_at: [{ operator: 'gte', value: '2024-01-01' }]
      });
      });

    it('should handle simple value (without operator) as eq', () => {
        const query = {
        status: 'active'
        };
        const options = {
          allowedFields: ['status'],
        };

        const filters = baseService.parseFilters(query, options);

      expect(filters).toEqual({
        status: [{ operator: 'eq', value: 'active' }]
      });
    });

    it('should ignore fields not in allowedFields', () => {
        const query = {
        email: { eq: 'test@example.com' },
        unauthorized: { eq: 'value' }
        };
        const options = {
        allowedFields: ['email'],
        };

        const filters = baseService.parseFilters(query, options);

      expect(filters).toEqual({
        email: [{ operator: 'eq', value: 'test@example.com' }]
      });
      expect(filters).not.toHaveProperty('unauthorized');
    });
  });

  describe('applyFilters - Nested Format', () => {
    it('should apply is_null filter', async () => {
      const filters = {
        field: [{ operator: 'is_null', value: null }]
      };

      baseService.applyFilters(mockQueryBuilder, filters, {});

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.field IS NULL');
    });

    it('should apply not_null filter', async () => {
      const filters = {
        field: [{ operator: 'not_null', value: null }]
      };

      baseService.applyFilters(mockQueryBuilder, filters, {});

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.field IS NOT NULL');
    });

    it('should apply eq filter', async () => {
      const filters = {
        status: [{ operator: 'eq', value: 'active' }]
      };

      baseService.applyFilters(mockQueryBuilder, filters, {});

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.status = :user_status_eq_0',
        { user_status_eq_0: 'active' }
      );
    });

    it('should apply gt filter', async () => {
      const filters = {
        age: [{ operator: 'gt', value: 18 }]
      };

      baseService.applyFilters(mockQueryBuilder, filters, {});

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.age > :user_age_gt_0',
        { user_age_gt_0: 18 }
      );
    });

    it('should apply in filter', async () => {
      const filters = {
        status: [{ operator: 'in', value: ['active', 'pending'] }]
      };

      baseService.applyFilters(mockQueryBuilder, filters, {});

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.status IN (:...user_status_in_0)',
        { user_status_in_0: ['active', 'pending'] }
      );
    });

    it('should apply like filter', async () => {
        const filters = {
        name: [{ operator: 'like', value: '%John%' }]
        };

        baseService.applyFilters(mockQueryBuilder, filters, {});

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.name LIKE :user_name_like_0',
        { user_name_like_0: '%John%' }
        );
      });

    it('should apply multiple conditions for same field', async () => {
        const filters = {
        age: [
          { operator: 'gte', value: 18 },
          { operator: 'lte', value: 65 }
        ]
        };

        baseService.applyFilters(mockQueryBuilder, filters, {});

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.age >= :user_age_gte_0',
        { user_age_gte_0: 18 }
      );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.age <= :user_age_lte_1',
        { user_age_lte_1: 65 }
        );
      });

    it('should handle related fields with nested structure', async () => {
        const filters = {
        memberShipDetails: {
          category_type: [{ operator: 'eq', value: 'FOW' }]
        }
        };

        baseService.applyFilters(mockQueryBuilder, filters, {});

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'memberShipDetails.category_type = :memberShipDetails_category_type_eq_0',
        { memberShipDetails_category_type_eq_0: 'FOW' }
        );
      });
  });
});
