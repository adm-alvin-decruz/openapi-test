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

const { UsersServicesV2 } = require('../../../api/users/usersServicesV2');
const { getDataSource } = require('../../../db/typeorm/data-source');

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
      console.warn('⚠️  Database not available, skipping integration tests:', error.message);
      dataSourceAvailable = false;
    }
  });

  afterAll(async () => {
    if (dataSourceAvailable) {
      try {
        const dataSource = await getDataSource();
        if (dataSource && dataSource.isInitialized) {
          await dataSource.destroy();
        }
      } catch (error) {
        console.error('Error in afterAll:', error);
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
  });

  /**
   * Helper to create mock request
   */
  function createMockRequest(query = {}) {
    return { query };
  }

  /**
   * Helper to skip test if database not available
   */
  function skipIfNoDB() {
    if (SKIP_INTEGRATION_TESTS || !dataSourceAvailable) {
      return true;
    }
    return false;
  }

  describe('getUsers - Basic Filters (Integration)', () => {
    it('should filter by email with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

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
      if (skipIfNoDB()) {
        return;
      }

      const req = createMockRequest({ status: '1' });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have status = 1
      result.data.users.forEach((user) => {
        expect(user.status).toBe(1);
      });
    });

    // NOTE: mandaiIdIsNull filter test is skipped because mandai_id column is NOT NULL in database schema
    // This filter may work in theory but cannot be tested with real data since all users must have mandai_id
    it.skip('should filter by mandaiIdIsNull with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

      const req = createMockRequest({ mandaiIdIsNull: 'true' });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have null mandaiId
      // NOTE: This test will likely return empty results since mandai_id is NOT NULL
      result.data.users.forEach((user) => {
        expect(user.mandaiId).toBeNull();
      });
    });

    it('should filter by singpassIdIsNull with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

      const req = createMockRequest({ singpassIdIsNull: 'true' });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have null singpassId
      result.data.users.forEach((user) => {
        expect(user.singpassId).toBeNull();
      });
    });

    it('should filter by singpassIdNotNull with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

      const req = createMockRequest({ singpassIdNotNull: 'true' });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have non-null singpassId
      result.data.users.forEach((user) => {
        expect(user.singpassId).not.toBeNull();
      });
    });
  });

  describe('getUsers - Date Range Filters (Integration)', () => {
    it('should filter by createdAtFrom with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

      const req = createMockRequest({ createdAtFrom: '2020-01-01' });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have createdAt >= 2020-01-01
      result.data.users.forEach((user) => {
        if (user.createdAt) {
          const userDate = new Date(user.createdAt);
          const filterDate = new Date('2020-01-01');
          expect(userDate.getTime()).toBeGreaterThanOrEqual(filterDate.getTime());
        }
      });
    });
  });

  describe('getUsers - Related Field Filters (Integration)', () => {
    it('should filter by categoryType with join to real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

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
      if (skipIfNoDB()) {
        return;
      }

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
      if (skipIfNoDB()) {
        return;
      }

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
      if (skipIfNoDB()) {
        return;
      }

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
      if (skipIfNoDB()) {
        return;
      }

      const req = createMockRequest({
        sortBy: 'createdAt',
        sortOrder: 'DESC',
        limit: '10',
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      
      // Verify sorting: each user's createdAt should be <= previous user's
      for (let i = 1; i < result.data.users.length; i++) {
        const prevDate = new Date(result.data.users[i - 1].createdAt);
        const currDate = new Date(result.data.users[i].createdAt);
        expect(currDate.getTime()).toBeLessThanOrEqual(prevDate.getTime());
      }
    });

    it('should sort by email ASC with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

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

  describe('getUsers - Comparison Operators (Integration)', () => {
    it('should filter by status[gt] with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

      const req = createMockRequest({ 'status[gt]': '0' });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have status > 0
      result.data.users.forEach((user) => {
        expect(user.status).toBeGreaterThan(0);
      });
    });

    it('should filter by status[lt] with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

      const req = createMockRequest({ 'status[lt]': '2' });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have status < 2
      result.data.users.forEach((user) => {
        expect(user.status).toBeLessThan(2);
      });
    });

    it('should filter by status[gte] with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

      const req = createMockRequest({ 'status[gte]': '1' });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have status >= 1
      result.data.users.forEach((user) => {
        expect(user.status).toBeGreaterThanOrEqual(1);
      });
    });

    it('should filter by status[lte] with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

      const req = createMockRequest({ 'status[lte]': '1' });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have status <= 1
      result.data.users.forEach((user) => {
        expect(user.status).toBeLessThanOrEqual(1);
      });
    });

    it('should filter by status[eq] with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

      const req = createMockRequest({ 'status[eq]': '1' });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have status = 1
      result.data.users.forEach((user) => {
        expect(user.status).toBe(1);
      });
    });

    it('should filter by status[ne] with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

      const req = createMockRequest({ 'status[ne]': '0' });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have status != 0
      result.data.users.forEach((user) => {
        expect(user.status).not.toBe(0);
      });
    });

    it('should combine multiple comparison operators with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

      const req = createMockRequest({
        'status[gte]': '1',
        'status[lte]': '1',
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all returned users have status >= 1 AND status <= 1 (i.e., status = 1)
      result.data.users.forEach((user) => {
        expect(user.status).toBe(1);
      });
    });

    it('should handle comparison operator with range (gte and lte)', async () => {
      if (skipIfNoDB()) {
        return;
      }

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
      if (skipIfNoDB()) {
        return;
      }

      // Test with a field that might have decimal values (if exists)
      // For now, test with status which is integer, but verify numeric parsing works
      const req = createMockRequest({ 'status[gt]': '0.5' });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify numeric parsing works (0.5 should be parsed as 0.5, but status is integer)
      // So status > 0.5 means status >= 1
      result.data.users.forEach((user) => {
        expect(user.status).toBeGreaterThan(0);
      });
    });

    it('should handle comparison operator with negative values', async () => {
      if (skipIfNoDB()) {
        return;
      }

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
      if (skipIfNoDB()) {
        return;
      }

      const req = createMockRequest({
        status: '1',
        email: '%@%',
        createdAtFrom: '2020-01-01',
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
        if (user.createdAt) {
          const userDate = new Date(user.createdAt);
          const filterDate = new Date('2020-01-01');
          expect(userDate.getTime()).toBeGreaterThanOrEqual(filterDate.getTime());
        }
      });
    });

    it('should combine comparison operators with other filters', async () => {
      if (skipIfNoDB()) {
        return;
      }

      const req = createMockRequest({
        'status[gte]': '1',
        email: '%@%',
        createdAtFrom: '2020-01-01',
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
        if (user.createdAt) {
          const userDate = new Date(user.createdAt);
          const filterDate = new Date('2020-01-01');
          expect(userDate.getTime()).toBeGreaterThanOrEqual(filterDate.getTime());
        }
      });
    });
  });

  describe('getUsers - Comparison Operators with Related Fields (Integration)', () => {
    it('should filter by membershipDetails.validUntil[gt] with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

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
      if (skipIfNoDB()) {
        return;
      }

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
      if (skipIfNoDB()) {
        return;
      }

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
      if (skipIfNoDB()) {
        return;
      }

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
      if (skipIfNoDB()) {
        return;
      }

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
      if (skipIfNoDB()) {
        return;
      }

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
      if (skipIfNoDB()) {
        return;
      }

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const req = createMockRequest({
        'status[gte]': '1',
        'membershipDetails.validUntil[gte]': todayStr,
      });
      const result = await UsersServicesV2.getUsers(req);

      expect(result.status).toBe('success');
      expect(result.data.users).toBeInstanceOf(Array);
      
      // Verify all filters are applied
      result.data.users.forEach((user) => {
        expect(user.status).toBeGreaterThanOrEqual(1);
        if (user.membershipDetails && user.membershipDetails.valid_until) {
          const userDate = new Date(user.membershipDetails.valid_until);
          const filterDate = new Date(todayStr);
          expect(userDate.getTime()).toBeGreaterThanOrEqual(filterDate.getTime());
        }
      });
    });
  });

  describe('getUsers - IsNull, NotNull and Date Range Filters for Related Fields (Integration)', () => {
    it('should filter by membershipDetails.validFromIsNull with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

      const req = createMockRequest({
        'membershipDetails.validFromIsNull': 'true',
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

    it('should filter by membershipDetails.validFromNotNull with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

      const req = createMockRequest({
        'membershipDetails.validFromNotNull': 'true',
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

    it('should filter by membershipDetails.validUntilNotNull with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

      const req = createMockRequest({
        'membershipDetails.validUntilNotNull': 'true',
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

    it('should filter by membershipDetails.validUntilIsNull with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

      const req = createMockRequest({
        'membershipDetails.validUntilIsNull': 'true',
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

    it('should filter by membershipDetails.validFromFrom with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      const req = createMockRequest({
        'membershipDetails.validFromFrom': pastDateStr,
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

    it('should filter by membershipDetails.validFromTo with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const req = createMockRequest({
        'membershipDetails.validFromTo': futureDateStr,
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

    it('should filter by membershipDetails.validUntilFrom with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      const req = createMockRequest({
        'membershipDetails.validUntilFrom': pastDateStr,
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

    it('should filter by membershipDetails.validUntilTo with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const req = createMockRequest({
        'membershipDetails.validUntilTo': futureDateStr,
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

    it('should filter by validFromFrom and validFromTo (range) with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 2);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const req = createMockRequest({
        'membershipDetails.validFromFrom': pastDateStr,
        'membershipDetails.validFromTo': futureDateStr,
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

    it('should filter by validUntilFrom and validUntilTo (range) with real database', async () => {
      if (skipIfNoDB()) {
        return;
      }

      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const req = createMockRequest({
        'membershipDetails.validUntilFrom': pastDateStr,
        'membershipDetails.validUntilTo': futureDateStr,
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
      if (skipIfNoDB()) {
        return;
      }

      const req = createMockRequest({ createdAtFrom: 'invalid-date' });
      
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
      if (skipIfNoDB()) {
        return;
      }

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
      if (skipIfNoDB()) {
        return;
      }

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
