-- Cleanup script for Integration Test data
-- Run this after integration tests to clean up test data

-- Delete user_membership_details for test users
DELETE umd FROM user_membership_details umd
INNER JOIN user_memberships um ON um.id = umd.user_membership_id
INNER JOIN users u ON u.id = um.user_id
WHERE u.email LIKE 'integration-test-%@example.com'
   OR u.email = 'integration-test-fom@example.com'
   OR u.email = 'integration-test-fom-junior@example.com'
   OR u.email = 'integration-test-expired@example.com'
   OR u.email = 'integration-test-future@example.com'
   OR u.email = 'integration-test-null-from@example.com'
   OR u.email = 'integration-test-null-until@example.com';

-- Delete user_memberships for test users
DELETE um FROM user_memberships um
INNER JOIN users u ON u.id = um.user_id
WHERE u.email LIKE 'integration-test-%@example.com'
   OR u.email = 'integration-test-fom@example.com'
   OR u.email = 'integration-test-fom-junior@example.com'
   OR u.email = 'integration-test-expired@example.com'
   OR u.email = 'integration-test-future@example.com'
   OR u.email = 'integration-test-null-from@example.com'
   OR u.email = 'integration-test-null-until@example.com';

-- Delete test users
DELETE FROM users
WHERE email LIKE 'integration-test-%@example.com'
   OR email = 'integration-test-fom@example.com'
   OR email = 'integration-test-fom-junior@example.com'
   OR email = 'integration-test-expired@example.com'
   OR email = 'integration-test-future@example.com'
   OR email = 'integration-test-null-from@example.com'
   OR email = 'integration-test-null-until@example.com';

SELECT 'Cleanup completed' as status;
