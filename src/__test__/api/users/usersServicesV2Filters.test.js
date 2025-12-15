const { UsersServicesV2 } = require('../../../api/users/usersServicesV2');
const UserDTO = require('../../../api/dtos/UserDTO');

// Mock BaseService methods
jest.mock('../../../services/baseService');
jest.mock('../../../api/dtos/UserDTO');

/**
 * IMPORTANT: Understanding Mock Data for Related Fields
 * 
 * When testing related fields (like categoryType from user_membership_details table):
 * 
 * 1. In reality, TypeORM's getRawMany() returns FLAT objects with alias-prefixed fields:
 *    {
 *      user_id: 1,
 *      user_email: 'test@example.com',
 *      membershipDetails_id: 10,
 *      membershipDetails_category_type: 'FOM'
 *    }
 * 
 * 2. BaseService.executeQuery() calls formatDataWithRelatedFields() which GROUPS related fields:
 *    {
 *      id: 1,
 *      email: 'test@example.com',
 *      membershipDetails: {
 *        id: 10,
 *        category_type: 'FOM'
 *      }
 *    }
 * 
 * 3. In our tests, we mock executeQuery() which already returns FORMATTED data (after grouping).
 *    So our mock data should have the nested structure with grouped related fields.
 * 
 * This is why mock data includes membershipDetails as a nested object, not flat fields.
 */

/**
 * ⚠️ TEST SCOPE WARNING ⚠️
 * 
 * This is a UNIT TEST for UsersServicesV2, NOT an integration test.
 * 
 * ✅ WHAT IS TESTED:
 * - Logic setup of UsersServicesV2 (joins, allowedFields, relatedFieldMappings)
 * - Response format and structure
 * - Error handling in UsersServicesV2
 * 
 * ❌ WHAT IS NOT TESTED (because we mock buildQuery and executeQuery):
 * - BaseService.buildQuery() logic (how query is actually built)
 * - BaseService.executeQuery() logic (how query is executed)
 * - BaseService.formatDataWithRelatedFields() logic (how related fields are grouped)
 * - BaseService.applyFilters() logic (how filters are applied to query)
 * - BaseService.parseFilters() logic (how filters are parsed)
 * - Actual SQL queries generated
 * - Database interactions
 * 
 * 📝 RECOMMENDATION:
 * - This unit test is still valuable for testing UsersServicesV2 setup logic
 * - For testing BaseService logic, see: baseService.test.js (to be created)
 * - For testing full flow with database, see: usersServicesV2Filters.integration.test.js (to be created)
 * - For manual testing with real database, see: testUsersV2Filters.js
 * 
 * See README_TESTING_STRATEGY.md for more details on testing strategy.
 */

describe('UsersServicesV2 - Filter Tests', () => {
  let usersService;
  let mockBuildQuery;
  let mockExecuteQuery;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock instance
    usersService = UsersServicesV2;

    // Mock buildQuery method
    mockBuildQuery = jest.fn();
    usersService.buildQuery = mockBuildQuery;

    // Mock executeQuery method
    mockExecuteQuery = jest.fn();
    usersService.executeQuery = mockExecuteQuery;

    // Mock UserDTO
    UserDTO.mockImplementation((user) => ({
      toJSON: jest.fn(() => ({
        id: user.id,
        email: user.email,
        status: user.status,
        mandaiId: user.mandaiId,
        singpassId: user.singpassId,
        createdAt: user.createdAt,
        membershipDetails: user.membershipDetails,
      })),
    }));
    
    // Mock UserDTO static methods (must match actual UserDTO implementation)
    UserDTO.getAllowedFields = jest.fn(() => [
      'email',
      'status',
      'mandaiId',
      'singpassId',
      'createdAt',
    ]);
    UserDTO.getMembershipFields = jest.fn(() => [
      'validFrom',
      'validUntil',
      'categoryType',
      'category_type',
      'valid_from',
      'valid_until',
    ]);
    UserDTO.getDefaultSortConfig = jest.fn(() => ({
      defaultSortBy: 'createdAt',
      defaultSortOrder: 'DESC',
    }));
    UserDTO.getAllowedSortFields = jest.fn(() => [
      'id',
      'email',
      'mandaiId',
      'singpassId',
      'status',
      'createdAt',
      'updatedAt',
    ]);
  });

  afterEach(() => {
    // Clear all mocks after each test
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Cleanup: Reset any cached instances
    if (usersService) {
      // Reset any cached properties
      usersService.repository = null;
      usersService.dataSource = null;
    }
    // Clear all mocks
    jest.clearAllMocks();
    // Clear timers
    jest.clearAllTimers();
    // Force exit - no need to wait
  });

  describe('getUsers - Basic Filters', () => {
    it('should filter by email (exact match)', async () => {
      const mockQueryBuilder = {};
      const mockPagination = { page: 1, limit: 50 };
      const mockOptions = {};

      mockBuildQuery.mockResolvedValue({
        queryBuilder: mockQueryBuilder,
        pagination: mockPagination,
        options: mockOptions,
      });

      const mockUsers = [
        {
          id: 1,
          email: 'test@example.com',
          status: 1,
          mandaiId: '12345',
          singpassId: null,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockExecuteQuery.mockResolvedValue({
        data: mockUsers,
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      });

      const req = {
        query: { email: 'test@example.com' },
      };

      const result = await usersService.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.statusCode).toBe(200);
      expect(result.data.users).toHaveLength(1);
      expect(result.data.users[0].email).toBe('test@example.com');
      expect(result.data.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      });

      expect(mockBuildQuery).toHaveBeenCalledWith(req, expect.objectContaining({
        allowedFields: expect.arrayContaining(['email']),
      }));
    });

    it('should filter by email with LIKE pattern', async () => {
      const mockQueryBuilder = {};
      const mockPagination = { page: 1, limit: 50 };
      const mockOptions = {};

      mockBuildQuery.mockResolvedValue({
        queryBuilder: mockQueryBuilder,
        pagination: mockPagination,
        options: mockOptions,
      });

      const mockUsers = [
        {
          id: 1,
          email: 'test@example.com',
          status: 1,
        },
        {
          id: 2,
          email: 'another@example.org',
          status: 1,
        },
      ];

      mockExecuteQuery.mockResolvedValue({
        data: mockUsers,
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1,
      });

      const req = {
        query: { email: '%example%' },
      };

      const result = await usersService.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toHaveLength(2);
      expect(mockBuildQuery).toHaveBeenCalledWith(req, expect.objectContaining({
        allowedFields: expect.arrayContaining(['email']),
      }));
    });

    it('should filter by status', async () => {
      const mockQueryBuilder = {};
      const mockPagination = { page: 1, limit: 50 };
      const mockOptions = {};

      mockBuildQuery.mockResolvedValue({
        queryBuilder: mockQueryBuilder,
        pagination: mockPagination,
        options: mockOptions,
      });

      const mockUsers = [
        {
          id: 1,
          email: 'test@example.com',
          status: 1,
        },
      ];

      mockExecuteQuery.mockResolvedValue({
        data: mockUsers,
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      });

      const req = {
        query: { status: '1' },
      };

      const result = await usersService.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toHaveLength(1);
      expect(result.data.users[0].status).toBe(1);
      expect(mockBuildQuery).toHaveBeenCalledWith(req, expect.objectContaining({
        allowedFields: expect.arrayContaining(['status']),
      }));
    });

    it('should filter by mandaiId', async () => {
      const mockQueryBuilder = {};
      const mockPagination = { page: 1, limit: 50 };
      const mockOptions = {};

      mockBuildQuery.mockResolvedValue({
        queryBuilder: mockQueryBuilder,
        pagination: mockPagination,
        options: mockOptions,
      });

      const mockUsers = [
        {
          id: 1,
          email: 'test@example.com',
          mandaiId: '12345',
        },
      ];

      mockExecuteQuery.mockResolvedValue({
        data: mockUsers,
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      });

      const req = {
        query: { mandaiId: '12345' },
      };

      const result = await usersService.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toHaveLength(1);
      expect(result.data.users[0].mandaiId).toBe('12345');
      expect(mockBuildQuery).toHaveBeenCalledWith(req, expect.objectContaining({
        allowedFields: expect.arrayContaining(['mandaiId']),
      }));
    });

    it('should filter by mandaiId is null', async () => {
      const mockQueryBuilder = {};
      const mockPagination = { page: 1, limit: 50 };
      const mockOptions = {};

      mockBuildQuery.mockResolvedValue({
        queryBuilder: mockQueryBuilder,
        pagination: mockPagination,
        options: mockOptions,
      });

      const mockUsers = [
        {
          id: 1,
          email: 'test@example.com',
          mandaiId: null,
        },
      ];

      mockExecuteQuery.mockResolvedValue({
        data: mockUsers,
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      });

      const req = {
        query: { mandaiId: { is_null: true } },
      };

      const result = await usersService.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toHaveLength(1);
      expect(mockBuildQuery).toHaveBeenCalledWith(req, expect.objectContaining({
        allowedFields: expect.arrayContaining(['mandaiId']),
      }));
    });

    it('should filter by singpassId', async () => {
      const mockQueryBuilder = {};
      const mockPagination = { page: 1, limit: 50 };
      const mockOptions = {};

      mockBuildQuery.mockResolvedValue({
        queryBuilder: mockQueryBuilder,
        pagination: mockPagination,
        options: mockOptions,
      });

      const mockUsers = [
        {
          id: 1,
          email: 'test@example.com',
          singpassId: 'singpass-123',
        },
      ];

      mockExecuteQuery.mockResolvedValue({
        data: mockUsers,
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      });

      const req = {
        query: { singpassId: 'singpass-123' },
      };

      const result = await usersService.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toHaveLength(1);
      expect(result.data.users[0].singpassId).toBe('singpass-123');
      expect(mockBuildQuery).toHaveBeenCalledWith(req, expect.objectContaining({
        allowedFields: expect.arrayContaining(['singpassId']),
      }));
    });
  });

  describe('getUsers - Date Range Filters', () => {
    it('should filter by createdAt gte', async () => {
      const mockQueryBuilder = {};
      const mockPagination = { page: 1, limit: 50 };
      const mockOptions = {};

      mockBuildQuery.mockResolvedValue({
        queryBuilder: mockQueryBuilder,
        pagination: mockPagination,
        options: mockOptions,
      });

      const mockUsers = [
        {
          id: 1,
          email: 'test@example.com',
          createdAt: '2024-06-01T00:00:00Z',
        },
      ];

      mockExecuteQuery.mockResolvedValue({
        data: mockUsers,
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      });

      // Express qs parser converts createdAt[gte]=value to { createdAt: { gte: 'value' } }
      const req = {
        query: { createdAt: { gte: '2024-01-01' } },
      };

      const result = await usersService.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toHaveLength(1);
      // Verify buildQuery was called with correct options including allowedFields
      expect(mockBuildQuery).toHaveBeenCalledWith(req, expect.objectContaining({
        allowedFields: expect.arrayContaining(['createdAt']),
      }));
    });

    it('should filter by createdAt range gte and lte', async () => {
      const mockQueryBuilder = {};
      const mockPagination = { page: 1, limit: 50 };
      const mockOptions = {};

      mockBuildQuery.mockResolvedValue({
        queryBuilder: mockQueryBuilder,
        pagination: mockPagination,
        options: mockOptions,
      });

      const mockUsers = [
        {
          id: 1,
          email: 'test@example.com',
          createdAt: '2024-06-01T00:00:00Z',
        },
      ];

      mockExecuteQuery.mockResolvedValue({
        data: mockUsers,
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      });

      // Express qs parser converts createdAt[gte]=value to { createdAt: { gte: 'value' } }
      const req = {
        query: {
          createdAt: {
            gte: '2024-01-01',
            lte: '2024-12-31',
          },
        },
      };

      const result = await usersService.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toHaveLength(1);
      // Verify buildQuery was called with correct options including allowedFields
      expect(mockBuildQuery).toHaveBeenCalledWith(req, expect.objectContaining({
        allowedFields: expect.arrayContaining(['createdAt']),
      }));
    });
  });

  describe('getUsers - Related Field Filters', () => {
    it('should filter by categoryType with join', async () => {
      const mockQueryBuilder = {};
      const mockPagination = { page: 1, limit: 50 };
      const mockOptions = {
        joins: [
          {
            type: 'leftJoin',
            entity: 'user_membership_details',
            alias: 'membershipDetails',
            condition: 'user.id = membershipDetails.user_id',
            selectFields: ['id', 'user_id', 'category_type'],
          },
        ],
        relatedFieldMappings: {
          categoryType: {
            alias: 'membershipDetails',
            field: 'category_type',
          },
        },
      };

      mockBuildQuery.mockResolvedValue({
        queryBuilder: mockQueryBuilder,
        pagination: mockPagination,
        options: mockOptions,
      });

      // After formatDataWithRelatedFields, data will be grouped like this:
      const mockFormattedUsers = [
        {
          id: 1,
          email: 'test@example.com',
          status: 1,
          created_at: '2024-01-01T00:00:00Z',
          membershipDetails: {
            id: 10,
            user_id: 1,
            category_type: 'FOM SENIOR INDIVIDUAL 1Y',
          },
        },
      ];

      mockExecuteQuery.mockResolvedValue({
        data: mockFormattedUsers,
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      });

      const req = {
        query: { categoryType: 'FOM SENIOR INDIVIDUAL 1Y' },
      };

      const result = await usersService.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toHaveLength(1);
      expect(mockBuildQuery).toHaveBeenCalledWith(req, expect.objectContaining({
        allowedFields: expect.arrayContaining(['categoryType']),
        joins: expect.arrayContaining([
          expect.objectContaining({
            entity: 'user_membership_details',
            alias: 'membershipDetails',
          }),
        ]),
        relatedFieldMappings: expect.objectContaining({
          categoryType: expect.objectContaining({
            alias: 'membershipDetails',
            field: 'category_type',
          }),
        }),
      }));
    });

    it('should not add join when categoryType is not in query', async () => {
      const mockQueryBuilder = {};
      const mockPagination = { page: 1, limit: 50 };
      const mockOptions = {};

      mockBuildQuery.mockResolvedValue({
        queryBuilder: mockQueryBuilder,
        pagination: mockPagination,
        options: mockOptions,
      });

      const mockUsers = [
        {
          id: 1,
          email: 'test@example.com',
          status: 1,
        },
      ];

      mockExecuteQuery.mockResolvedValue({
        data: mockUsers,
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      });

      const req = {
        query: { email: 'test@example.com' },
      };

      const result = await usersService.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toHaveLength(1);
      expect(mockBuildQuery).toHaveBeenCalledWith(req, expect.objectContaining({
        allowedFields: expect.not.arrayContaining(['categoryType']),
        joins: [],
        relatedFieldMappings: {},
      }));
    });

    it('should filter by categoryType with LIKE pattern', async () => {
      const mockQueryBuilder = {};
      const mockPagination = { page: 1, limit: 50 };
      const mockOptions = {
        joins: [
          {
            type: 'leftJoin',
            entity: 'user_membership_details',
            alias: 'membershipDetails',
            condition: 'user.id = membershipDetails.user_id',
            selectFields: ['id', 'user_id', 'category_type'],
          },
        ],
        relatedFieldMappings: {
          categoryType: {
            alias: 'membershipDetails',
            field: 'category_type',
          },
        },
      };

      mockBuildQuery.mockResolvedValue({
        queryBuilder: mockQueryBuilder,
        pagination: mockPagination,
        options: mockOptions,
      });

      // Mock data after formatDataWithRelatedFields has grouped the related fields
      // In reality: getRawMany() returns flat objects like {user_id: 1, membershipDetails_category_type: 'FOM'}
      // formatDataWithRelatedFields groups them into: {id: 1, membershipDetails: {category_type: 'FOM'}}
      const mockUsers = [
        {
          id: 1,
          email: 'test1@example.com',
          membershipDetails: {
            id: 10,
            user_id: 1,
            category_type: 'FOM SENIOR INDIVIDUAL 1Y',
          },
        },
        {
          id: 2,
          email: 'test2@example.com',
          membershipDetails: {
            id: 11,
            user_id: 2,
            category_type: 'FOM JUNIOR INDIVIDUAL 1Y',
          },
        },
      ];

      mockExecuteQuery.mockResolvedValue({
        data: mockUsers,
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1,
      });

      const req = {
        query: { categoryType: '%FOM%' },
      };

      const result = await usersService.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toHaveLength(2);
      expect(mockBuildQuery).toHaveBeenCalledWith(req, expect.objectContaining({
        allowedFields: expect.arrayContaining(['categoryType']),
        joins: expect.arrayContaining([
          expect.objectContaining({
            entity: 'user_membership_details',
            alias: 'membershipDetails',
          }),
        ]),
      }));
    });

    it('should combine categoryType filter with other filters', async () => {
      const mockQueryBuilder = {};
      const mockPagination = { page: 1, limit: 50 };
      const mockOptions = {
        joins: [
          {
            type: 'leftJoin',
            entity: 'user_membership_details',
            alias: 'membershipDetails',
            condition: 'user.id = membershipDetails.user_id',
            selectFields: ['id', 'user_id', 'category_type'],
          },
        ],
        relatedFieldMappings: {
          categoryType: {
            alias: 'membershipDetails',
            field: 'category_type',
          },
        },
      };

      mockBuildQuery.mockResolvedValue({
        queryBuilder: mockQueryBuilder,
        pagination: mockPagination,
        options: mockOptions,
      });

      // Mock data after formatDataWithRelatedFields - related fields are grouped
      const mockUsers = [
        {
          id: 1,
          email: 'test@example.com',
          status: 1,
          membershipDetails: {
            id: 10,
            user_id: 1,
            category_type: 'FOM',
          },
        },
      ];

      mockExecuteQuery.mockResolvedValue({
        data: mockUsers,
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      });

      const req = {
        query: {
          categoryType: 'FOM',
          status: '1',
          email: 'test@example.com',
        },
      };

      const result = await usersService.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toHaveLength(1);
      expect(mockBuildQuery).toHaveBeenCalledWith(req, expect.objectContaining({
        allowedFields: expect.arrayContaining(['categoryType', 'status', 'email']),
        joins: expect.arrayContaining([
          expect.objectContaining({
            entity: 'user_membership_details',
            alias: 'membershipDetails',
          }),
        ]),
        relatedFieldMappings: expect.objectContaining({
          categoryType: expect.objectContaining({
            alias: 'membershipDetails',
            field: 'category_type',
          }),
        }),
      }));
    });

    it('should handle categoryType with pagination and sorting', async () => {
      const mockQueryBuilder = {};
      const mockPagination = { page: 1, limit: 20 };
      const mockOptions = {
        joins: [
          {
            type: 'leftJoin',
            entity: 'user_membership_details',
            alias: 'membershipDetails',
            condition: 'user.id = membershipDetails.user_id',
            selectFields: ['id', 'user_id', 'category_type'],
          },
        ],
        relatedFieldMappings: {
          categoryType: {
            alias: 'membershipDetails',
            field: 'category_type',
          },
        },
      };

      mockBuildQuery.mockResolvedValue({
        queryBuilder: mockQueryBuilder,
        pagination: mockPagination,
        options: mockOptions,
      });

      // Mock data after formatDataWithRelatedFields - related fields from joined table are grouped
      const mockUsers = [
        {
          id: 1,
          email: 'test@example.com',
          membershipDetails: {
            id: 10,
            user_id: 1,
            category_type: 'FOM',
          },
        },
      ];

      mockExecuteQuery.mockResolvedValue({
        data: mockUsers,
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });

      const req = {
        query: {
          categoryType: 'FOM',
          page: '1',
          limit: '20',
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        },
      };

      const result = await usersService.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toHaveLength(1);
      expect(result.data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
      expect(mockBuildQuery).toHaveBeenCalledWith(req, expect.objectContaining({
        allowedFields: expect.arrayContaining(['categoryType']),
        joins: expect.arrayContaining([
          expect.objectContaining({
            entity: 'user_membership_details',
            alias: 'membershipDetails',
          }),
        ]),
      }));
    });

    it('should handle empty categoryType filter (empty string)', async () => {
      const mockQueryBuilder = {};
      const mockPagination = { page: 1, limit: 50 };
      const mockOptions = {};

      mockBuildQuery.mockResolvedValue({
        queryBuilder: mockQueryBuilder,
        pagination: mockPagination,
        options: mockOptions,
      });

      const mockUsers = [
        {
          id: 1,
          email: 'test@example.com',
        },
      ];

      mockExecuteQuery.mockResolvedValue({
        data: mockUsers,
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      });

      const req = {
        query: { categoryType: '' },
      };

      const result = await usersService.getUsers(req);

      expect(result.status).toBe('success');
      // Empty string should not trigger join
      expect(mockBuildQuery).toHaveBeenCalledWith(req, expect.objectContaining({
        joins: [],
        relatedFieldMappings: {},
      }));
    });
  });

  describe('getUsers - Combined Filters', () => {
    it('should handle multiple filters combined', async () => {
      const mockQueryBuilder = {};
      const mockPagination = { page: 1, limit: 50 };
      const mockOptions = {};

      mockBuildQuery.mockResolvedValue({
        queryBuilder: mockQueryBuilder,
        pagination: mockPagination,
        options: mockOptions,
      });

      const mockUsers = [
        {
          id: 1,
          email: 'test@example.com',
          status: 1,
          createdAt: '2024-06-01T00:00:00Z',
        },
      ];

      mockExecuteQuery.mockResolvedValue({
        data: mockUsers,
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      });

      // Express qs parser converts field[operator]=value to { field: { operator: 'value' } }
      const req = {
        query: {
          status: '1',
          email: { like: '%example%' },
          createdAt: { gte: '2024-01-01' },
        },
      };

      const result = await usersService.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toHaveLength(1);
      // Verify buildQuery was called with correct options including allowedFields
      expect(mockBuildQuery).toHaveBeenCalledWith(req, expect.objectContaining({
        allowedFields: expect.arrayContaining(['status', 'email', 'createdAt']),
      }));
    });
  });

  describe('getUsers - Pagination', () => {
    it('should handle pagination parameters', async () => {
      const mockQueryBuilder = {};
      const mockPagination = { page: 2, limit: 10 };
      const mockOptions = {};

      mockBuildQuery.mockResolvedValue({
        queryBuilder: mockQueryBuilder,
        pagination: mockPagination,
        options: mockOptions,
      });

      const mockUsers = [
        { id: 11, email: 'user11@example.com' },
        { id: 12, email: 'user12@example.com' },
      ];

      mockExecuteQuery.mockResolvedValue({
        data: mockUsers,
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
      });

      const req = {
        query: { page: '2', limit: '10' },
      };

      const result = await usersService.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
    });

    it('should use default pagination when not provided', async () => {
      const mockQueryBuilder = {};
      const mockPagination = { page: 1, limit: 50 };
      const mockOptions = {};

      mockBuildQuery.mockResolvedValue({
        queryBuilder: mockQueryBuilder,
        pagination: mockPagination,
        options: mockOptions,
      });

      const mockUsers = [];

      mockExecuteQuery.mockResolvedValue({
        data: mockUsers,
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
      });

      const req = {
        query: {},
      };

      const result = await usersService.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
      });
    });
  });

  describe('getUsers - Sorting', () => {
    it('should handle sorting parameters', async () => {
      const mockQueryBuilder = {};
      const mockPagination = { page: 1, limit: 50 };
      const mockOptions = {};

      mockBuildQuery.mockResolvedValue({
        queryBuilder: mockQueryBuilder,
        pagination: mockPagination,
        options: mockOptions,
      });

      const mockUsers = [
        { id: 1, email: 'a@example.com', createdAt: '2024-01-01T00:00:00Z' },
        { id: 2, email: 'b@example.com', createdAt: '2024-02-01T00:00:00Z' },
      ];

      mockExecuteQuery.mockResolvedValue({
        data: mockUsers,
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1,
      });

      const req = {
        query: { sortBy: 'createdAt', sortOrder: 'ASC' },
      };

      const result = await usersService.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toHaveLength(2);
      // Verify buildQuery was called with correct options including sorting config
      expect(mockBuildQuery).toHaveBeenCalledWith(req, expect.objectContaining({
        allowedSortFields: expect.arrayContaining(['createdAt', 'email', 'id']),
        defaultSortBy: 'createdAt',
        defaultSortOrder: 'DESC',
      }));
    });

    it('should handle sorting by email DESC', async () => {
      const mockQueryBuilder = {};
      const mockPagination = { page: 1, limit: 50 };
      const mockOptions = {};

      mockBuildQuery.mockResolvedValue({
        queryBuilder: mockQueryBuilder,
        pagination: mockPagination,
        options: mockOptions,
      });

      const mockUsers = [
        { id: 2, email: 'z@example.com' },
        { id: 1, email: 'a@example.com' },
      ];

      mockExecuteQuery.mockResolvedValue({
        data: mockUsers,
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1,
      });

      const req = {
        query: { sortBy: 'email', sortOrder: 'DESC' },
      };

      const result = await usersService.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toHaveLength(2);
    });
  });

  describe('getUsers - Full Query with All Options', () => {
    it('should handle full query with filters, pagination, and sorting', async () => {
      const mockQueryBuilder = {};
      const mockPagination = { page: 1, limit: 20 };
      const mockOptions = {
        joins: [
          {
            type: 'leftJoin',
            entity: 'user_membership_details',
            alias: 'membershipDetails',
            condition: 'user.id = membershipDetails.user_id',
            selectFields: ['id', 'user_id', 'category_type'],
          },
        ],
        relatedFieldMappings: {
          categoryType: {
            alias: 'membershipDetails',
            field: 'category_type',
          },
        },
      };

      mockBuildQuery.mockResolvedValue({
        queryBuilder: mockQueryBuilder,
        pagination: mockPagination,
        options: mockOptions,
      });

      // Mock data after formatDataWithRelatedFields - related fields from joined table are grouped
      const mockUsers = [
        {
          id: 1,
          email: 'test@example.com',
          status: 1,
          createdAt: '2024-06-01T00:00:00Z',
          membershipDetails: {
            id: 10,
            user_id: 1,
            category_type: 'FOM',
          },
        },
      ];

      mockExecuteQuery.mockResolvedValue({
        data: mockUsers,
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });

      // Express qs parser converts createdAt[gte]=value to { createdAt: { gte: 'value' } }
      const req = {
        query: {
          status: '1',
          createdAt: { gte: '2024-01-01' },
          categoryType: 'FOM',
          page: '1',
          limit: '20',
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        },
      };

      const result = await usersService.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.statusCode).toBe(200);
      expect(result.membership.code).toBe(200);
      expect(result.membership.mwgCode).toBe('MWG_CIAM_USERS_GET_SUCCESS');
      expect(result.data.users).toHaveLength(1);
      expect(result.data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('getUsers - Error Handling', () => {
    it('should handle errors from buildQuery', async () => {
      const error = new Error('Database connection failed');
      mockBuildQuery.mockRejectedValue(error);

      const req = {
        query: { email: 'test@example.com' },
      };

      await expect(usersService.getUsers(req)).rejects.toThrow('Database connection failed');
    });

    it('should handle errors from executeQuery', async () => {
      const mockQueryBuilder = {};
      const mockPagination = { page: 1, limit: 50 };
      const mockOptions = {};

      mockBuildQuery.mockResolvedValue({
        queryBuilder: mockQueryBuilder,
        pagination: mockPagination,
        options: mockOptions,
      });

      const error = new Error('Query execution failed');
      mockExecuteQuery.mockRejectedValue(error);

      const req = {
        query: { email: 'test@example.com' },
      };

      await expect(usersService.getUsers(req)).rejects.toThrow('Query execution failed');
    });
  });

  describe('getUsers - Response Structure', () => {
    it('should return correct response structure', async () => {
      const mockQueryBuilder = {};
      const mockPagination = { page: 1, limit: 50 };
      const mockOptions = {};

      mockBuildQuery.mockResolvedValue({
        queryBuilder: mockQueryBuilder,
        pagination: mockPagination,
        options: mockOptions,
      });

      const mockUsers = [
        {
          id: 1,
          email: 'test@example.com',
          status: 1,
          mandaiId: '12345',
          singpassId: null,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockExecuteQuery.mockResolvedValue({
        data: mockUsers,
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      });

      const req = {
        query: {},
      };

      const result = await usersService.getUsers(req);

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('statusCode');
      expect(result).toHaveProperty('membership');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('users');
      expect(result.data).toHaveProperty('pagination');
      expect(result.membership).toHaveProperty('code');
      expect(result.membership).toHaveProperty('mwgCode');
      expect(result.membership).toHaveProperty('message');
      expect(Array.isArray(result.data.users)).toBe(true);
    });
  });
});
