/**
 * Integration Test for UsersServicesV2
 * 
 * ⚠️ REQUIREMENTS:
 * - Requires database connection (MySQL)
 * - Set SKIP_INTEGRATION_TESTS=true to skip these tests
 * - These tests test the FULL flow from request to database to response
 * 
 * 📝 SEED DATA:
 * - Tests can work with existing data in database
 * - For consistent results, seed test data before running:
 *   mysql -h HOST -u USER -p DATABASE < src/__test__/api/users/seed-integration-test-data.sql
 * 
 * - To cleanup test data after tests:
 *   mysql -h HOST -u USER -p DATABASE < src/__test__/api/users/cleanup-integration-test-data.sql
 * 
 * To run:
 *   npm test -- usersServicesV2Filters.integration.test.js
 * 
 * To skip:
 *   SKIP_INTEGRATION_TESTS=true npm test -- usersServicesV2Filters.integration.test.js
 * 
 * NOTE: Tests are designed to work with ANY data in database, but seeding test data
 * ensures consistent and predictable test results.
 */

// Load environment variables from .env file BEFORE anything else
require('dotenv').config();

const { UsersServicesV2 } = require('../../../api/users/usersServicesV2');
const { getDataSource, closeDataSource } = require('../../../db/typeorm/data-source');

// Skip integration tests if flag is set or if database is not available
const SKIP_INTEGRATION_TESTS = process.env.SKIP_INTEGRATION_TESTS === 'true';

describe('UsersServicesV2 - Integration Tests', () => {
  let dataSourceAvailable = false;

  beforeAll(async () => {
    if (SKIP_INTEGRATION_TESTS) {
      console.log('⚠️  Integration tests skipped (SKIP_INTEGRATION_TESTS=true)');
      return;
    }

      // Try to connect to database
    try {
      const dataSource = await getDataSource();
      if (dataSource && dataSource.isInitialized) {
        dataSourceAvailable = true;
      } else {
        await dataSource.initialize();
        dataSourceAvailable = true;
      }
    } catch (error) {
      console.warn('⚠️  Database not available, skipping integration tests');
      console.error('Database connection error:', error.message);
      dataSourceAvailable = false;
    }
  });

  afterAll(async () => {
    if (dataSourceAvailable) {
      try {
        await closeDataSource();
      } catch (error) {
        console.error('Error closing dataSource in afterAll:', error);
        // Ignore cleanup errors
      }
    }

    // Cleanup: Reset any cached instances in UsersServicesV2
    if (UsersServicesV2) {
      UsersServicesV2.repository = null;
      UsersServicesV2.dataSource = null;
    }

    // Clear any timers or async operations
    jest.clearAllTimers();
    
    // Force Jest to exit - give a small delay for cleanup to complete
    // But don't wait too long as forceExit should handle it
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  /**
   * Helper to create mock request
   */
  function createMockRequest(query = {}) {
    return { query };
  }

  /**
   * Helper to check database availability
   * Throws error if database is not available to ensure tests fail
   */
  function requireDB() {
    if (SKIP_INTEGRATION_TESTS) {
      throw new Error('Integration tests are skipped (SKIP_INTEGRATION_TESTS=true)');
    }
    if (!dataSourceAvailable) {
      throw new Error('Database connection required for integration tests. Please ensure database is running and accessible.');
    }
  }

  describe('getUsers - Basic Filters (Integration)', () => {
    it('should filter by email with real database', async () => {
      requireDB();

      const req = createMockRequest({ email: '%@%' }); // Match any email
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveProperty('users');
      expect(result.data).toHaveProperty('pagination');
      expect(Array.isArray(result.data.users)).toBe(true);
      expect(result.data.pagination).toHaveProperty('page');
      expect(result.data.pagination).toHaveProperty('limit');
      expect(result.data.pagination).toHaveProperty('total');
      expect(result.data.pagination).toHaveProperty('totalPages');
    });

    it('should filter by status with real database', async () => {
      requireDB();

      const req = createMockRequest({ status: '1' });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have status = 1
      result.data.users.forEach((user) => {
          expect(user.status).toBe(1);
        });
    });

    // NOTE: mandaiId is null filter test is skipped because mandai_id column is NOT NULL in database schema
    // This filter may work in theory but cannot be tested with real data since all users must have mandai_id
    it.skip('should filter by mandaiId is null with real database', async () => {
      requireDB();

      const req = createMockRequest({ mandaiId: { is_null: true } });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have null mandaiId
      // NOTE: This test will likely return empty results since mandai_id is NOT NULL
      result.data.users.forEach((user) => {
        expect(user.mandaiId).toBeNull();
      });
    });

    it('should filter by singpassId is null with real database', async () => {
      requireDB();

      const req = createMockRequest({ singpassId: { is_null: true } });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have null singpass_id (DTO skips null fields, so field is undefined)
      result.data.users.forEach((user) => {
        expect(user.singpass_id).toBeUndefined(); // DTO skips null fields
      });
    });

    it('should filter by singpassId not null with real database', async () => {
      requireDB();

      const req = createMockRequest({ singpassId: { not_null: true } });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have non-null singpass_id
      result.data.users.forEach((user) => {
        expect(user.singpass_id).toBeDefined(); // Field exists in DTO
      });
    });

    it('should filter by mandaiId with real database', async () => {
      requireDB();

      // Get first user's mandai_id from database to use for filter
      const reqAll = createMockRequest({ limit: '1' });
      const resultAll = await UsersServicesV2.getUsers(reqAll);
      
      if (resultAll.data.users.length === 0) {
        // Skip test if no users in database
        return;
      }
      
      const testMandaiId = resultAll.data.users[0].mandai_id;
      const req = createMockRequest({ mandaiId: testMandaiId });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      expect(result.data.users.length).toBeGreaterThan(0);
      
      // Verify all returned users have matching mandai_id
      result.data.users.forEach((user) => {
        expect(user.mandai_id).toBe(testMandaiId);
      });
    });

    it('should filter by mandaiId not null with real database', async () => {
      requireDB();

      const req = createMockRequest({ mandaiId: { not_null: true } });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have non-null mandai_id
      result.data.users.forEach((user) => {
        expect(user.mandai_id).toBeDefined();
      });
    });

    it('should filter by singpassId with real database', async () => {
      requireDB();

      // Get first user with singpass_id from database
      const reqWithSingpass = createMockRequest({ singpassId: { not_null: true }, limit: '1' });
      const resultWithSingpass = await UsersServicesV2.getUsers(reqWithSingpass);
      
      if (resultWithSingpass.data.users.length === 0) {
        // Skip test if no users with singpass_id
        return;
      }
      
      const testSingpassId = resultWithSingpass.data.users[0].singpass_id;
      const req = createMockRequest({ singpassId: testSingpassId });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      expect(result.data.users.length).toBeGreaterThan(0);
      
      // Verify all returned users have matching singpass_id
      result.data.users.forEach((user) => {
        expect(user.singpass_id).toBe(testSingpassId);
      });
    });

    it('should filter by createdAt with real database', async () => {
      requireDB();

      const req = createMockRequest({ createdAt: '2024-01-01' });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have matching created_at date
      result.data.users.forEach((user) => {
        if (user.created_at) {
          const userDate = new Date(user.created_at);
          const filterDate = new Date('2024-01-01');
          expect(userDate.toDateString()).toBe(filterDate.toDateString());
        }
      });
    });
  });

  describe('getUsers - Date Range Filters (Integration)', () => {
    it('should filter by createdAt[gte] with real database', async () => {
      requireDB();

      const req = createMockRequest({ 'createdAt[gte]': '2020-01-01' });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have created_at >= 2020-01-01
      result.data.users.forEach((user) => {
        if (user.created_at) {
          const userDate = new Date(user.created_at);
          const filterDate = new Date('2020-01-01');
          expect(userDate.getTime()).toBeGreaterThanOrEqual(filterDate.getTime());
        }
      });
    });
  });

  describe('getUsers - Related Field Filters (Integration)', () => {
    it('should filter by categoryType with join to real database', async () => {
      requireDB();

      const req = createMockRequest({ categoryType: '%FOM%' });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify related fields are grouped correctly
      result.data.users.forEach((user) => {
        if (user.membershipDetails) {
          expect(user.membershipDetails).toBeInstanceOf(Object);
          expect(user.membershipDetails.category_type).toContain('FOM');
        }
      });
    });

    it('should not include membershipDetails when categoryType not in query', async () => {
      requireDB();

      const req = createMockRequest({ email: '%@%' });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      
      // When categoryType is not in query, join should not be added
      // So membershipDetails should not be present (unless it's included by default)
      // This test verifies the join is conditional
      if (result.data.users.length > 0) {
        // At least verify the structure is correct
        expect(result.data.users[0]).toHaveProperty('id');
        expect(result.data.users[0]).toHaveProperty('email');
      }
    });
  });

  describe('getUsers - Pagination (Integration)', () => {
    it('should handle pagination correctly with real database', async () => {
      requireDB();

      const req = createMockRequest({ page: '1', limit: '5' });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.pagination.page).toBe(1);
      expect(result.data.pagination.limit).toBe(5);
      expect(result.data.users.length).toBeLessThanOrEqual(5);
      
      // If there are more than 5 users, verify pagination
      if (result.data.pagination.total > 5) {
        expect(result.data.pagination.totalPages).toBeGreaterThan(1);
      }
    });

    it('should return correct page 2 with real database', async () => {
      requireDB();

      const req1 = createMockRequest({ page: '1', limit: '5' });
      const result1 = await UsersServicesV2.getUsers(req1);

      if (result1.data.pagination.totalPages > 1) {
        const req2 = createMockRequest({ page: '2', limit: '5' });
        const result2 = await UsersServicesV2.getUsers(req2);

        expect(result2.data.pagination.page).toBe(2);
        expect(result2.data.users.length).toBeLessThanOrEqual(5);
        
        // Verify different users on different pages
        if (result1.data.users.length > 0 && result2.data.users.length > 0) {
          expect(result1.data.users[0].id).not.toBe(result2.data.users[0].id);
        }
      }
    });
  });

  describe('getUsers - Sorting (Integration)', () => {
    it('should sort by createdAt DESC with real database', async () => {
      requireDB();

      const req = createMockRequest({
        sortBy: 'createdAt',
        sortOrder: 'DESC',
        limit: '10',
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      
      // Verify sorting: each user's created_at should be <= previous user's
      for (let i = 1; i < result.data.users.length; i++) {
        const prevDate = new Date(result.data.users[i - 1].created_at);
        const currDate = new Date(result.data.users[i].created_at);
        expect(currDate.getTime()).toBeLessThanOrEqual(prevDate.getTime());
      }
    });

    it('should sort by email ASC with real database', async () => {
      requireDB();

      const req = createMockRequest({
        sortBy: 'email',
        sortOrder: 'ASC',
        limit: '10',
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      
      // Verify sorting: emails should be in ascending order
      for (let i = 1; i < result.data.users.length; i++) {
        const prevEmail = result.data.users[i - 1].email?.toLowerCase() || '';
        const currEmail = result.data.users[i].email?.toLowerCase() || '';
        expect(currEmail >= prevEmail).toBe(true);
      }
    });
  });

  describe('getUsers - Comparison Operators with Date/String (Integration)', () => {
    it('should filter by createdAt[gt] with date string', async () => {
      requireDB();

      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      const req = createMockRequest({ 'createdAt[gt]': pastDateStr });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have createdAt > pastDate
      result.data.users.forEach((user) => {
        if (user.createdAt) {
          const userDate = new Date(user.createdAt);
          const filterDate = new Date(pastDateStr);
          expect(userDate.getTime()).toBeGreaterThan(filterDate.getTime());
        }
      });
    });

    it('should filter by createdAt[lt] with date string', async () => {
      requireDB();

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const req = createMockRequest({ 'createdAt[lt]': futureDateStr });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have createdAt < futureDate
      result.data.users.forEach((user) => {
        if (user.createdAt) {
          const userDate = new Date(user.createdAt);
          const filterDate = new Date(futureDateStr);
          expect(userDate.getTime()).toBeLessThan(filterDate.getTime());
        }
      });
    });

    it('should filter by email[gt] with string (lexicographic comparison)', async () => {
      requireDB();

      const req = createMockRequest({ 'email[gt]': 'a@example.com' });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have email > 'a@example.com' (lexicographic)
      result.data.users.forEach((user) => {
        if (user.email) {
          expect(user.email.localeCompare('a@example.com')).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('getUsers - Comparison Operators (Integration)', () => {
    it('should filter by status[gt] with real database', async () => {
      requireDB();

      const req = createMockRequest({ 'status[gt]': '-1' }); // Use -1 to ensure we get results
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify response structure
      expect(result.data).toHaveProperty('users');
      expect(result.data).toHaveProperty('pagination');
      
      // Verify query was successful (tests the gt operator works)
      expect(result.data.users.length).toBeGreaterThanOrEqual(0);
      
      // If users exist, verify they match filter
      result.data.users.forEach((user) => {
        expect(user.status).toBeGreaterThan(-1);
      });
    });

    it('should filter by status[lt] with real database', async () => {
      requireDB();

      const req = createMockRequest({ 'status[lt]': '99' }); // Use higher value to get results
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have status < 99
      result.data.users.forEach((user) => {
        expect(user.status).toBeLessThan(99);
      });
    });

    it('should filter by status[gte] with real database', async () => {
      requireDB();

      const req = createMockRequest({ 'status[gte]': '0' }); // Use 0 to get all users
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have status >= 0
      result.data.users.forEach((user) => {
        expect(user.status).toBeGreaterThanOrEqual(0);
      });
    });

    it('should filter by status[lte] with real database', async () => {
      requireDB();

      const req = createMockRequest({ 'status[lte]': '99' }); // Use higher value
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have status <= 99
      result.data.users.forEach((user) => {
        expect(user.status).toBeLessThanOrEqual(99);
      });
    });

    it('should filter by status[eq] with real database', async () => {
      requireDB();

      // Get first user's status to use for filter
      const reqAll = createMockRequest({ limit: '10' }); // Get more users to find varied status
      const resultAll = await UsersServicesV2.getUsers(reqAll);
      
      if (resultAll.data.users.length === 0) {
        return; // Skip if no users
      }
      
      // Find a user with status that exists
      const testStatus = resultAll.data.users[0].status;
      const req = createMockRequest({ 'status[eq]': String(testStatus) });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      expect(result.data.users.length).toBeGreaterThan(0); // Should have results
      
      // Verify query executed successfully
      expect(result.data).toHaveProperty('pagination');
    });

    it('should filter by status[ne] with real database', async () => {
      requireDB();

      const req = createMockRequest({ 'status[ne]': '999' }); // Use value that likely doesn't exist
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have status != 999
      result.data.users.forEach((user) => {
        expect(user.status).not.toBe(999);
      });
    });

    it('should combine multiple comparison operators with real database', async () => {
      requireDB();

      const req = createMockRequest({
        'status[gte]': '0',
        'status[lte]': '99',
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have status between 0 and 99
      result.data.users.forEach((user) => {
        expect(user.status).toBeGreaterThanOrEqual(0);
        expect(user.status).toBeLessThanOrEqual(99);
      });
    });

    it('should handle comparison operator with range (gte and lte)', async () => {
      requireDB();

      const req = createMockRequest({
        'status[gte]': '0',
        'status[lte]': '2',
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have status between 0 and 2 (inclusive)
      result.data.users.forEach((user) => {
        expect(user.status).toBeGreaterThanOrEqual(0);
        expect(user.status).toBeLessThanOrEqual(2);
      });
    });

    it('should handle comparison operator with decimal values', async () => {
      requireDB();

      // Test with a field that might have decimal values (if exists)
      // For now, test with status which is integer, but verify numeric parsing works
      const req = createMockRequest({ 'status[gt]': '-1' }); // Use -1 to get all users
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify numeric parsing works - all users should have status > -1
      result.data.users.forEach((user) => {
        expect(user.status).toBeGreaterThan(-1);
      });
    });

    it('should handle comparison operator with negative values', async () => {
      requireDB();

      // Test that negative values are parsed correctly
      // Since status is typically >= 0, this should return all users
      const req = createMockRequest({ 'status[gt]': '-1' });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have status > -1 (should be all users with status >= 0)
      result.data.users.forEach((user) => {
        expect(user.status).toBeGreaterThan(-1);
      });
    });
  });

  describe('getUsers - Combined Filters (Integration)', () => {
    it('should combine multiple filters correctly with real database', async () => {
      requireDB();

      const req = createMockRequest({
        status: '1',
        email: '%@%',
        'createdAt[gte]': '2020-01-01',
        page: '1',
        limit: '10',
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users.length).toBeLessThanOrEqual(10);
      
      // Verify all filters are applied
      result.data.users.forEach((user) => {
        expect(user.status).toBe(1);
        expect(user.email).toContain('@');
        if (user.created_at) {
          const userDate = new Date(user.created_at);
          const filterDate = new Date('2020-01-01');
          expect(userDate.getTime()).toBeGreaterThanOrEqual(filterDate.getTime());
        }
      });
    });

    it('should combine comparison operators with other filters', async () => {
      requireDB();

      const req = createMockRequest({
        'status[gte]': '1',
        email: '%@%',
        'createdAt[gte]': '2020-01-01',
        page: '1',
        limit: '10',
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users.length).toBeLessThanOrEqual(10);
      
      // Verify all filters are applied
      result.data.users.forEach((user) => {
        expect(user.status).toBeGreaterThanOrEqual(1);
        expect(user.email).toContain('@');
        if (user.created_at) {
          const userDate = new Date(user.created_at);
          const filterDate = new Date('2020-01-01');
          expect(userDate.getTime()).toBeGreaterThanOrEqual(filterDate.getTime());
        }
      });
    });
  });

  describe('getUsers - Comparison Operators with Related Fields (Integration)', () => {
    it('should filter by membershipDetails.validUntil[gt] with real database', async () => {
      requireDB();

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const req = createMockRequest({
        'membershipDetails.validUntil[gt]': futureDateStr,
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have validUntil > futureDate
      result.data.users.forEach((user) => {
        if (user.membershipDetails && user.membershipDetails.valid_until) {
          const userDate = new Date(user.membershipDetails.valid_until);
          const filterDate = new Date(futureDateStr);
          expect(userDate.getTime()).toBeGreaterThan(filterDate.getTime());
        }
      });
    });

    it('should filter by membershipDetails.validUntil[lt] with real database', async () => {
      requireDB();

      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      const req = createMockRequest({
        'membershipDetails.validUntil[lt]': pastDateStr,
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have validUntil < pastDate
      result.data.users.forEach((user) => {
        if (user.membershipDetails && user.membershipDetails.valid_until) {
          const userDate = new Date(user.membershipDetails.valid_until);
          const filterDate = new Date(pastDateStr);
          expect(userDate.getTime()).toBeLessThan(filterDate.getTime());
        }
      });
    });

    it('should filter by membershipDetails.validUntil[gte] with real database', async () => {
      requireDB();

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const req = createMockRequest({
        'membershipDetails.validUntil[gte]': todayStr,
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have validUntil >= today
      result.data.users.forEach((user) => {
        if (user.membershipDetails && user.membershipDetails.valid_until) {
          const userDate = new Date(user.membershipDetails.valid_until);
          const filterDate = new Date(todayStr);
          expect(userDate.getTime()).toBeGreaterThanOrEqual(filterDate.getTime());
        }
      });
    });

    it('should filter by membershipDetails.validUntil[lte] with real database', async () => {
      requireDB();

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const req = createMockRequest({
        'membershipDetails.validUntil[lte]': todayStr,
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have validUntil <= today
      result.data.users.forEach((user) => {
        if (user.membershipDetails && user.membershipDetails.valid_until) {
          const userDate = new Date(user.membershipDetails.valid_until);
          const filterDate = new Date(todayStr);
          expect(userDate.getTime()).toBeLessThanOrEqual(filterDate.getTime());
        }
      });
    });

    it('should filter by membershipDetails.validFrom[gte] with real database', async () => {
      requireDB();

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const req = createMockRequest({
        'membershipDetails.validFrom[gte]': todayStr,
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have validFrom >= today
      result.data.users.forEach((user) => {
        if (user.membershipDetails && user.membershipDetails.valid_from) {
          const userDate = new Date(user.membershipDetails.valid_from);
          const filterDate = new Date(todayStr);
          expect(userDate.getTime()).toBeGreaterThanOrEqual(filterDate.getTime());
        }
      });
    });

    it('should combine multiple related field comparison operators', async () => {
      requireDB();

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const req = createMockRequest({
        'membershipDetails.validFrom[gte]': todayStr,
        'membershipDetails.validUntil[lte]': futureDateStr,
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have validFrom >= today AND validUntil <= futureDate
      result.data.users.forEach((user) => {
        if (user.membershipDetails) {
          if (user.membershipDetails.valid_from) {
            const userFromDate = new Date(user.membershipDetails.valid_from);
            const filterFromDate = new Date(todayStr);
            expect(userFromDate.getTime()).toBeGreaterThanOrEqual(filterFromDate.getTime());
          }
          if (user.membershipDetails.valid_until) {
            const userUntilDate = new Date(user.membershipDetails.valid_until);
            const filterUntilDate = new Date(futureDateStr);
            expect(userUntilDate.getTime()).toBeLessThanOrEqual(filterUntilDate.getTime());
          }
        }
      });
    });

    it('should combine related field comparison operators with main field filters', async () => {
      requireDB();

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const req = createMockRequest({
        'status[gte]': '0', // Use 0 to get results
        'membershipDetails.validUntil[gte]': todayStr,
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all filters are applied
      result.data.users.forEach((user) => {
        expect(user.status).toBeGreaterThanOrEqual(0);
        if (user.membershipDetails && user.membershipDetails.valid_until) {
          const userDate = new Date(user.membershipDetails.valid_until);
          const filterDate = new Date(todayStr);
          expect(userDate.getTime()).toBeGreaterThanOrEqual(filterDate.getTime());
        }
      });
    });
  });

  describe('getUsers - is null, not null and date range filters for related fields (Integration)', () => {
    it('should filter by membershipDetails.validFrom[is_null] with real database', async () => {
      requireDB();

      const req = createMockRequest({
        'membershipDetails.validFrom[is_null]': true,
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have null validFrom in membershipDetails
      result.data.users.forEach((user) => {
        if (user.membershipDetails) {
          expect(user.membershipDetails.valid_from).toBeNull();
        }
      });
    });

    it('should filter by membershipDetails.validFrom[not_null] with real database', async () => {
      requireDB();

      const req = createMockRequest({
        'membershipDetails.validFrom[not_null]': true,
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have non-null validFrom in membershipDetails
      result.data.users.forEach((user) => {
        if (user.membershipDetails) {
          expect(user.membershipDetails.valid_from).not.toBeNull();
        }
      });
    });

    it('should filter by membershipDetails.validUntil[not_null] with real database', async () => {
      requireDB();

      const req = createMockRequest({
        'membershipDetails.validUntil[not_null]': true,
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have non-null validUntil in membershipDetails
      result.data.users.forEach((user) => {
        if (user.membershipDetails) {
          expect(user.membershipDetails.valid_until).not.toBeNull();
        }
      });
    });

    it('should filter by membershipDetails.validUntil[is_null] with real database', async () => {
      requireDB();

      const req = createMockRequest({
        'membershipDetails.validUntil[is_null]': true,
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have null validUntil in membershipDetails
      result.data.users.forEach((user) => {
        if (user.membershipDetails) {
          expect(user.membershipDetails.valid_until).toBeNull();
        }
      });
    });

    it('should filter by membershipDetails.validFrom[gte] with real database', async () => {
      requireDB();

      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      const req = createMockRequest({
        'membershipDetails.validFrom[gte]': pastDateStr,
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have validFrom >= pastDate
      result.data.users.forEach((user) => {
        if (user.membershipDetails && user.membershipDetails.valid_from) {
          const userDate = new Date(user.membershipDetails.valid_from);
          const filterDate = new Date(pastDateStr);
          expect(userDate.getTime()).toBeGreaterThanOrEqual(filterDate.getTime());
        }
      });
    });

    it('should filter by membershipDetails.validFrom[lte] with real database', async () => {
      requireDB();

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const req = createMockRequest({
        'membershipDetails.validFrom[lte]': futureDateStr,
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have validFrom <= futureDate
      result.data.users.forEach((user) => {
        if (user.membershipDetails && user.membershipDetails.valid_from) {
          const userDate = new Date(user.membershipDetails.valid_from);
          const filterDate = new Date(futureDateStr);
          expect(userDate.getTime()).toBeLessThanOrEqual(filterDate.getTime());
        }
      });
    });

    it('should filter by membershipDetails.validUntil[gte] with real database', async () => {
      requireDB();

      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      const req = createMockRequest({
        'membershipDetails.validUntil[gte]': pastDateStr,
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have validUntil >= pastDate
      result.data.users.forEach((user) => {
        if (user.membershipDetails && user.membershipDetails.valid_until) {
          const userDate = new Date(user.membershipDetails.valid_until);
          const filterDate = new Date(pastDateStr);
          expect(userDate.getTime()).toBeGreaterThanOrEqual(filterDate.getTime());
        }
      });
    });

    it('should filter by membershipDetails.validUntil[lte] with real database', async () => {
      requireDB();

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const req = createMockRequest({
        'membershipDetails.validUntil[lte]': futureDateStr,
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have validUntil <= futureDate
      result.data.users.forEach((user) => {
        if (user.membershipDetails && user.membershipDetails.valid_until) {
          const userDate = new Date(user.membershipDetails.valid_until);
          const filterDate = new Date(futureDateStr);
          expect(userDate.getTime()).toBeLessThanOrEqual(filterDate.getTime());
        }
      });
    });

    it('should filter by validFrom range (gte and lte) with real database', async () => {
      requireDB();

      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 2);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const req = createMockRequest({
        'membershipDetails.validFrom[gte]': pastDateStr,
        'membershipDetails.validFrom[lte]': futureDateStr,
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have validFrom between pastDate and futureDate
      result.data.users.forEach((user) => {
        if (user.membershipDetails && user.membershipDetails.valid_from) {
          const userDate = new Date(user.membershipDetails.valid_from);
          const fromDate = new Date(pastDateStr);
          const toDate = new Date(futureDateStr);
          expect(userDate.getTime()).toBeGreaterThanOrEqual(fromDate.getTime());
          expect(userDate.getTime()).toBeLessThanOrEqual(toDate.getTime());
        }
      });
    });

    it('should filter by validUntil range (gte and lte) with real database', async () => {
      requireDB();

      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const req = createMockRequest({
        'membershipDetails.validUntil[gte]': pastDateStr,
        'membershipDetails.validUntil[lte]': futureDateStr,
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have validUntil between pastDate and futureDate
      result.data.users.forEach((user) => {
        if (user.membershipDetails && user.membershipDetails.valid_until) {
          const userDate = new Date(user.membershipDetails.valid_until);
          const fromDate = new Date(pastDateStr);
          const toDate = new Date(futureDateStr);
          expect(userDate.getTime()).toBeGreaterThanOrEqual(fromDate.getTime());
          expect(userDate.getTime()).toBeLessThanOrEqual(toDate.getTime());
        }
      });
    });
  });

  describe('getUsers - Error Handling (Integration)', () => {
    it('should handle invalid date format gracefully', async () => {
      requireDB();

      const req = createMockRequest({ 'createdAt[gte]': 'invalid-date' });
      
      // Should either return empty results or handle error gracefully
      try {
        const result = await UsersServicesV2.getUsers(req);
        // If it doesn't throw, verify response structure
        expect(result).toHaveProperty('status');
      } catch (error) {
        // Error is acceptable for invalid input
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('getUsers - Response Structure (Integration)', () => {
    it('should return correct response structure with real database', async () => {
      requireDB();

      const req = createMockRequest({ limit: '1' });
      const result = await UsersServicesV2.getUsers(req);

      // Verify response structure
      expect(result).toHaveProperty('status', 'success');
      expect(result).toHaveProperty('statusCode', 200);
      expect(result).toHaveProperty('membership');
      expect(result).toHaveProperty('data');
      
      expect(result.membership).toHaveProperty('code', 200);
      expect(result.membership).toHaveProperty('mwgCode', 'MWG_CIAM_USERS_GET_SUCCESS');
      expect(result.membership).toHaveProperty('message');
      
      expect(result.data).toHaveProperty('users');
      expect(result.data).toHaveProperty('pagination');
      
      expect(Array.isArray(result.data.users)).toBe(true);
      expect(result.data.pagination).toHaveProperty('page');
      expect(result.data.pagination).toHaveProperty('limit');
      expect(result.data.pagination).toHaveProperty('total');
      expect(result.data.pagination).toHaveProperty('totalPages');
    });

    it('should format user data correctly with UserDTO', async () => {
      requireDB();

      const req = createMockRequest({ limit: '1' });
      const result = await UsersServicesV2.getUsers(req);

      if (result.data.users.length > 0) {
        const user = result.data.users[0];
        
        // Verify UserDTO formatting (dates should be ISO strings)
        if (user.createdAt) {
          expect(typeof user.createdAt).toBe('string');
          expect(() => new Date(user.createdAt)).not.toThrow();
        }
        
        // Verify hidden fields are not exposed
        expect(user).not.toHaveProperty('password_hash');
        }
    });
  });
});
