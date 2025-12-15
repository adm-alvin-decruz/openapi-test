-- Seed data for Integration Tests
-- This script creates test users with various scenarios for testing filters
-- Run this before running integration tests: mysql < seed-integration-test-data.sql

-- ============================================
-- 1. Test user with email filter
-- ============================================
INSERT INTO users (
  email,
  given_name,
  family_name,
  birthdate,
  mandai_id,
  source,
  status,
  singpass_id,
  created_at,
  updated_at
) VALUES (
  'integration-test-1@example.com',
  'Integration',
  'Test1',
  '1990-01-01 00:00:00',
  'INTEG001',
  1,
  1,
  NULL,
  '2024-01-15 10:00:00',
  NOW()
) AS new
ON DUPLICATE KEY UPDATE
  given_name = new.given_name,
  family_name = new.family_name,
  status = new.status,
  updated_at = NOW();

-- ============================================
-- 2. Test user with status = 1
-- ============================================
INSERT INTO users (
  email,
  given_name,
  family_name,
  birthdate,
  mandai_id,
  source,
  status,
  singpass_id,
  created_at,
  updated_at
) VALUES (
  'integration-test-2@example.com',
  'Integration',
  'Test2',
  '1990-02-01 00:00:00',
  'INTEG002',
  1,
  1,
  'integration-singpass-002',
  '2024-02-15 10:00:00',
  NOW()
) AS new
ON DUPLICATE KEY UPDATE
  given_name = new.given_name,
  family_name = new.family_name,
  status = new.status,
  updated_at = NOW();

-- ============================================
-- 3. Test user with empty mandaiId (for testing)
-- NOTE: mandai_id is NOT NULL in schema, so we use empty string or special value
-- For mandaiId is null filter test, we'll use a user that doesn't exist or skip that test
-- ============================================
INSERT INTO users (
  email,
  given_name,
  family_name,
  birthdate,
  mandai_id,
  source,
  status,
  singpass_id,
  created_at,
  updated_at
) VALUES (
  'integration-test-3@example.com',
  'Integration',
  'Test3',
  '1990-03-01 00:00:00',
  'INTEG003',
  1,
  1,
  NULL,
  '2024-03-15 10:00:00',
  NOW()
) AS new
ON DUPLICATE KEY UPDATE
  given_name = new.given_name,
  family_name = new.family_name,
  mandai_id = new.mandai_id,
  status = new.status,
  updated_at = NOW();

-- ============================================
-- 4. Test user with categoryType = 'FOM SENIOR INDIVIDUAL 1Y'
-- ============================================
INSERT INTO users (
  email,
  given_name,
  family_name,
  birthdate,
  mandai_id,
  source,
  status,
  singpass_id,
  created_at,
  updated_at
) VALUES (
  'integration-test-fom@example.com',
  'FOM',
  'Test',
  '1950-01-01 00:00:00',
  'FOM001',
  1,
  1,
  'fom-singpass-id',
  '2024-01-01 10:00:00',
  NOW()
) AS new
ON DUPLICATE KEY UPDATE
  given_name = new.given_name,
  family_name = new.family_name,
  status = new.status,
  updated_at = NOW();

-- Get user_id for FOM membership
SET @fom_user_id = (SELECT id FROM users WHERE email = 'integration-test-fom@example.com' LIMIT 1);

-- Insert/Update user_memberships for FOM user
INSERT INTO user_memberships (
  user_id,
  name,
  visual_id,
  expires_at,
  created_at,
  updated_at
) VALUES (
  @fom_user_id,
  'membership-passes',
  'FOM-VISUAL-001',
  DATE_ADD(NOW(), INTERVAL 1 YEAR),
  NOW(),
  NOW()
) AS new
ON DUPLICATE KEY UPDATE
  expires_at = new.expires_at,
  updated_at = NOW();

-- Get user_membership_id
SET @fom_membership_id = (SELECT id FROM user_memberships WHERE user_id = @fom_user_id AND name = 'membership-passes' LIMIT 1);

-- Insert/Update user_membership_details with category_type = 'FOM SENIOR INDIVIDUAL 1Y'
INSERT INTO user_membership_details (
  user_id,
  user_membership_id,
  category_type,
  item_name,
  plu,
  adult_qty,
  child_qty,
  status,
  parking,
  member_first_name,
  member_last_name,
  member_email,
  member_dob,
  valid_from,
  valid_until,
  created_at,
  updated_at
) VALUES (
  @fom_user_id,
  @fom_membership_id,
  'FOM SENIOR INDIVIDUAL 1Y',
  'FOM Senior Individual 1 Year',
  'FOM-SENIOR-1Y-PLU',
  1,
  0,
  0,
  1,
  'FOM',
  'Test',
  'integration-test-fom@example.com',
  '1950-01-01 00:00:00',
  NOW(),
  DATE_ADD(NOW(), INTERVAL 1 YEAR),
  NOW(),
  NOW()
) AS new
ON DUPLICATE KEY UPDATE
  category_type = new.category_type,
  item_name = new.item_name,
  valid_until = new.valid_until,
  status = new.status,
  updated_at = NOW();

-- ============================================
-- 5. Test user with categoryType = 'FOM JUNIOR INDIVIDUAL 1Y'
-- ============================================
INSERT INTO users (
  email,
  given_name,
  family_name,
  birthdate,
  mandai_id,
  source,
  status,
  singpass_id,
  created_at,
  updated_at
) VALUES (
  'integration-test-fom-junior@example.com',
  'FOM',
  'Junior',
  '2010-01-01 00:00:00',
  'FOM002',
  1,
  1,
  'fom-junior-singpass-id',
  '2024-01-01 10:00:00',
  NOW()
) AS new
ON DUPLICATE KEY UPDATE
  given_name = new.given_name,
  family_name = new.family_name,
  status = new.status,
  updated_at = NOW();

-- Get user_id for FOM Junior membership
SET @fom_junior_user_id = (SELECT id FROM users WHERE email = 'integration-test-fom-junior@example.com' LIMIT 1);

-- Insert/Update user_memberships for FOM Junior user
INSERT INTO user_memberships (
  user_id,
  name,
  visual_id,
  expires_at,
  created_at,
  updated_at
) VALUES (
  @fom_junior_user_id,
  'membership-passes',
  'FOM-JUNIOR-VISUAL-001',
  DATE_ADD(NOW(), INTERVAL 1 YEAR),
  NOW(),
  NOW()
) AS new
ON DUPLICATE KEY UPDATE
  expires_at = new.expires_at,
  updated_at = NOW();

-- Get user_membership_id
SET @fom_junior_membership_id = (SELECT id FROM user_memberships WHERE user_id = @fom_junior_user_id AND name = 'membership-passes' LIMIT 1);

-- Insert/Update user_membership_details with category_type = 'FOM JUNIOR INDIVIDUAL 1Y'
INSERT INTO user_membership_details (
  user_id,
  user_membership_id,
  category_type,
  item_name,
  plu,
  adult_qty,
  child_qty,
  status,
  parking,
  member_first_name,
  member_last_name,
  member_email,
  member_dob,
  valid_from,
  valid_until,
  created_at,
  updated_at
) VALUES (
  @fom_junior_user_id,
  @fom_junior_membership_id,
  'FOM JUNIOR INDIVIDUAL 1Y',
  'FOM Junior Individual 1 Year',
  'FOM-JUNIOR-1Y-PLU',
  0,
  1,
  0,
  1,
  'FOM',
  'Junior',
  'integration-test-fom-junior@example.com',
  '2010-01-01 00:00:00',
  NOW(),
  DATE_ADD(NOW(), INTERVAL 1 YEAR),
  NOW(),
  NOW()
) AS new
ON DUPLICATE KEY UPDATE
  category_type = new.category_type,
  item_name = new.item_name,
  valid_until = new.valid_until,
  status = new.status,
  updated_at = NOW();

-- ============================================
-- 6. Test user with status = 0 (for testing status[gt], status[ne])
-- ============================================
INSERT INTO users (
  email,
  given_name,
  family_name,
  birthdate,
  mandai_id,
  source,
  status,
  singpass_id,
  created_at,
  updated_at
) VALUES (
  'integration-test-status-0@example.com',
  'Status',
  'Zero',
  '1990-01-01 00:00:00',
  'STATUS0',
  1,
  0,
  NULL,
  '2024-01-01 10:00:00',
  NOW()
) AS new
ON DUPLICATE KEY UPDATE
  given_name = new.given_name,
  family_name = new.family_name,
  status = new.status,
  updated_at = NOW();

-- ============================================
-- 7. Test user with status = 2 (for testing status[lt], status[lte])
-- ============================================
INSERT INTO users (
  email,
  given_name,
  family_name,
  birthdate,
  mandai_id,
  source,
  status,
  singpass_id,
  created_at,
  updated_at
) VALUES (
  'integration-test-status-2@example.com',
  'Status',
  'Two',
  '1990-01-01 00:00:00',
  'STATUS2',
  1,
  2,
  NULL,
  '2024-01-01 10:00:00',
  NOW()
) AS new
ON DUPLICATE KEY UPDATE
  given_name = new.given_name,
  family_name = new.family_name,
  status = new.status,
  updated_at = NOW();

-- ============================================
-- 8. Test user with membership details - valid_until in past (for testing validUntil[lt])
-- ============================================
INSERT INTO users (
  email,
  given_name,
  family_name,
  birthdate,
  mandai_id,
  source,
  status,
  singpass_id,
  created_at,
  updated_at
) VALUES (
  'integration-test-expired@example.com',
  'Expired',
  'Membership',
  '1990-01-01 00:00:00',
  'EXPIRED1',
  1,
  1,
  NULL,
  '2024-01-01 10:00:00',
  NOW()
) AS new
ON DUPLICATE KEY UPDATE
  given_name = new.given_name,
  family_name = new.family_name,
  status = new.status,
  updated_at = NOW();

-- Get user_id for expired membership
SET @expired_user_id = (SELECT id FROM users WHERE email = 'integration-test-expired@example.com' LIMIT 1);

-- Insert/Update user_memberships for expired user
INSERT INTO user_memberships (
  user_id,
  name,
  visual_id,
  expires_at,
  created_at,
  updated_at
) VALUES (
  @expired_user_id,
  'membership-passes',
  'EXPIRED-VISUAL-001',
  DATE_SUB(NOW(), INTERVAL 1 YEAR),
  NOW(),
  NOW()
) AS new
ON DUPLICATE KEY UPDATE
  expires_at = new.expires_at,
  updated_at = NOW();

-- Get user_membership_id
SET @expired_membership_id = (SELECT id FROM user_memberships WHERE user_id = @expired_user_id AND name = 'membership-passes' LIMIT 1);

-- Insert/Update user_membership_details with valid_until in past
INSERT INTO user_membership_details (
  user_id,
  user_membership_id,
  category_type,
  item_name,
  plu,
  adult_qty,
  child_qty,
  status,
  parking,
  member_first_name,
  member_last_name,
  member_email,
  member_dob,
  valid_from,
  valid_until,
  created_at,
  updated_at
) VALUES (
  @expired_user_id,
  @expired_membership_id,
  'EXPIRED MEMBERSHIP',
  'Expired Membership',
  'EXPIRED-PLU',
  1,
  0,
  0,
  1,
  'Expired',
  'Test',
  'integration-test-expired@example.com',
  '1990-01-01 00:00:00',
  DATE_SUB(NOW(), INTERVAL 2 YEAR),
  DATE_SUB(NOW(), INTERVAL 1 YEAR),
  NOW(),
  NOW()
) AS new
ON DUPLICATE KEY UPDATE
  category_type = new.category_type,
  item_name = new.item_name,
  valid_from = new.valid_from,
  valid_until = new.valid_until,
  status = new.status,
  updated_at = NOW();

-- ============================================
-- 9. Test user with membership details - valid_from in future (for testing validFrom[gte])
-- ============================================
INSERT INTO users (
  email,
  given_name,
  family_name,
  birthdate,
  mandai_id,
  source,
  status,
  singpass_id,
  created_at,
  updated_at
) VALUES (
  'integration-test-future@example.com',
  'Future',
  'Membership',
  '1990-01-01 00:00:00',
  'FUTURE1',
  1,
  1,
  NULL,
  '2024-01-01 10:00:00',
  NOW()
) AS new
ON DUPLICATE KEY UPDATE
  given_name = new.given_name,
  family_name = new.family_name,
  status = new.status,
  updated_at = NOW();

-- Get user_id for future membership
SET @future_user_id = (SELECT id FROM users WHERE email = 'integration-test-future@example.com' LIMIT 1);

-- Insert/Update user_memberships for future user
INSERT INTO user_memberships (
  user_id,
  name,
  visual_id,
  expires_at,
  created_at,
  updated_at
) VALUES (
  @future_user_id,
  'membership-passes',
  'FUTURE-VISUAL-001',
  DATE_ADD(NOW(), INTERVAL 2 YEAR),
  NOW(),
  NOW()
) AS new
ON DUPLICATE KEY UPDATE
  expires_at = new.expires_at,
  updated_at = NOW();

-- Get user_membership_id
SET @future_membership_id = (SELECT id FROM user_memberships WHERE user_id = @future_user_id AND name = 'membership-passes' LIMIT 1);

-- Insert/Update user_membership_details with valid_from in future
INSERT INTO user_membership_details (
  user_id,
  user_membership_id,
  category_type,
  item_name,
  plu,
  adult_qty,
  child_qty,
  status,
  parking,
  member_first_name,
  member_last_name,
  member_email,
  member_dob,
  valid_from,
  valid_until,
  created_at,
  updated_at
) VALUES (
  @future_user_id,
  @future_membership_id,
  'FUTURE MEMBERSHIP',
  'Future Membership',
  'FUTURE-PLU',
  1,
  0,
  0,
  1,
  'Future',
  'Test',
  'integration-test-future@example.com',
  '1990-01-01 00:00:00',
  DATE_ADD(NOW(), INTERVAL 1 MONTH),
  DATE_ADD(NOW(), INTERVAL 2 YEAR),
  NOW(),
  NOW()
) AS new
ON DUPLICATE KEY UPDATE
  category_type = new.category_type,
  item_name = new.item_name,
  valid_from = new.valid_from,
  valid_until = new.valid_until,
  status = new.status,
  updated_at = NOW();

-- ============================================
-- 10. Test user with membership details - valid_from = NULL (for testing validFrom is null)
-- ============================================
INSERT INTO users (
  email,
  given_name,
  family_name,
  birthdate,
  mandai_id,
  source,
  status,
  singpass_id,
  created_at,
  updated_at
) VALUES (
  'integration-test-null-from@example.com',
  'Null',
  'From',
  '1990-01-01 00:00:00',
  'NULLFROM1',
  1,
  1,
  NULL,
  '2024-01-01 10:00:00',
  NOW()
) AS new
ON DUPLICATE KEY UPDATE
  given_name = new.given_name,
  family_name = new.family_name,
  status = new.status,
  updated_at = NOW();

-- Get user_id for null from membership
SET @null_from_user_id = (SELECT id FROM users WHERE email = 'integration-test-null-from@example.com' LIMIT 1);

-- Insert/Update user_memberships for null from user
INSERT INTO user_memberships (
  user_id,
  name,
  visual_id,
  expires_at,
  created_at,
  updated_at
) VALUES (
  @null_from_user_id,
  'membership-passes',
  'NULL-FROM-VISUAL-001',
  DATE_ADD(NOW(), INTERVAL 1 YEAR),
  NOW(),
  NOW()
) AS new
ON DUPLICATE KEY UPDATE
  expires_at = new.expires_at,
  updated_at = NOW();

-- Get user_membership_id
SET @null_from_membership_id = (SELECT id FROM user_memberships WHERE user_id = @null_from_user_id AND name = 'membership-passes' LIMIT 1);

-- Insert/Update user_membership_details with valid_from = NULL
INSERT INTO user_membership_details (
  user_id,
  user_membership_id,
  category_type,
  item_name,
  plu,
  adult_qty,
  child_qty,
  status,
  parking,
  member_first_name,
  member_last_name,
  member_email,
  member_dob,
  valid_from,
  valid_until,
  created_at,
  updated_at
) VALUES (
  @null_from_user_id,
  @null_from_membership_id,
  'NULL FROM MEMBERSHIP',
  'Null From Membership',
  'NULL-FROM-PLU',
  1,
  0,
  0,
  1,
  'Null',
  'From',
  'integration-test-null-from@example.com',
  '1990-01-01 00:00:00',
  NULL,
  DATE_ADD(NOW(), INTERVAL 1 YEAR),
  NOW(),
  NOW()
) AS new
ON DUPLICATE KEY UPDATE
  category_type = new.category_type,
  item_name = new.item_name,
  valid_from = new.valid_from,
  valid_until = new.valid_until,
  status = new.status,
  updated_at = NOW();

-- ============================================
-- 11. Test user with membership details - valid_until = NULL (for testing validUntil is null)
-- ============================================
INSERT INTO users (
  email,
  given_name,
  family_name,
  birthdate,
  mandai_id,
  source,
  status,
  singpass_id,
  created_at,
  updated_at
) VALUES (
  'integration-test-null-until@example.com',
  'Null',
  'Until',
  '1990-01-01 00:00:00',
  'NULLUNTIL1',
  1,
  1,
  NULL,
  '2024-01-01 10:00:00',
  NOW()
) AS new
ON DUPLICATE KEY UPDATE
  given_name = new.given_name,
  family_name = new.family_name,
  status = new.status,
  updated_at = NOW();

-- Get user_id for null until membership
SET @null_until_user_id = (SELECT id FROM users WHERE email = 'integration-test-null-until@example.com' LIMIT 1);

-- Insert/Update user_memberships for null until user
INSERT INTO user_memberships (
  user_id,
  name,
  visual_id,
  expires_at,
  created_at,
  updated_at
) VALUES (
  @null_until_user_id,
  'membership-passes',
  'NULL-UNTIL-VISUAL-001',
  NULL,
  NOW(),
  NOW()
) AS new
ON DUPLICATE KEY UPDATE
  expires_at = new.expires_at,
  updated_at = NOW();

-- Get user_membership_id
SET @null_until_membership_id = (SELECT id FROM user_memberships WHERE user_id = @null_until_user_id AND name = 'membership-passes' LIMIT 1);

-- Insert/Update user_membership_details with valid_until = NULL
INSERT INTO user_membership_details (
  user_id,
  user_membership_id,
  category_type,
  item_name,
  plu,
  adult_qty,
  child_qty,
  status,
  parking,
  member_first_name,
  member_last_name,
  member_email,
  member_dob,
  valid_from,
  valid_until,
  created_at,
  updated_at
) VALUES (
  @null_until_user_id,
  @null_until_membership_id,
  'NULL UNTIL MEMBERSHIP',
  'Null Until Membership',
  'NULL-UNTIL-PLU',
  1,
  0,
  0,
  1,
  'Null',
  'Until',
  'integration-test-null-until@example.com',
  '1990-01-01 00:00:00',
  NOW(),
  NULL,
  NOW(),
  NOW()
) AS new
ON DUPLICATE KEY UPDATE
  category_type = new.category_type,
  item_name = new.item_name,
  valid_from = new.valid_from,
  valid_until = new.valid_until,
  status = new.status,
  updated_at = NOW();

-- ============================================
-- Verify seeded data
-- ============================================
SELECT 
  'Seeded users count' as info,
  COUNT(*) as count
FROM users 
WHERE email LIKE 'integration-test-%@example.com'
   OR email = 'integration-test-fom@example.com'
   OR email = 'integration-test-fom-junior@example.com';

SELECT 
  'Users with FOM membership' as info,
  COUNT(DISTINCT u.id) as count
FROM users u
INNER JOIN user_memberships um ON um.user_id = u.id
INNER JOIN user_membership_details umd ON umd.user_membership_id = um.id
WHERE u.email LIKE 'integration-test-fom%@example.com'
  AND umd.category_type LIKE 'FOM%';

SELECT 
  'Users with status = 0' as info,
  COUNT(*) as count
FROM users 
WHERE email = 'integration-test-status-0@example.com' AND status = 0;

SELECT 
  'Users with status = 2' as info,
  COUNT(*) as count
FROM users 
WHERE email = 'integration-test-status-2@example.com' AND status = 2;

SELECT 
  'Users with expired membership' as info,
  COUNT(DISTINCT u.id) as count
FROM users u
INNER JOIN user_memberships um ON um.user_id = u.id
INNER JOIN user_membership_details umd ON umd.user_membership_id = um.id
WHERE u.email = 'integration-test-expired@example.com'
  AND umd.valid_until < NOW();

SELECT 
  'Users with future membership' as info,
  COUNT(DISTINCT u.id) as count
FROM users u
INNER JOIN user_memberships um ON um.user_id = u.id
INNER JOIN user_membership_details umd ON umd.user_membership_id = um.id
WHERE u.email = 'integration-test-future@example.com'
  AND umd.valid_from > NOW();

SELECT 
  'Users with NULL singpass_id' as info,
  COUNT(*) as count
FROM users 
WHERE email LIKE 'integration-test-%@example.com' AND singpass_id IS NULL;

SELECT 
  'Users with NULL valid_from' as info,
  COUNT(DISTINCT u.id) as count
FROM users u
INNER JOIN user_memberships um ON um.user_id = u.id
INNER JOIN user_membership_details umd ON umd.user_membership_id = um.id
WHERE u.email = 'integration-test-null-from@example.com'
  AND umd.valid_from IS NULL;

SELECT 
  'Users with NULL valid_until' as info,
  COUNT(DISTINCT u.id) as count
FROM users u
INNER JOIN user_memberships um ON um.user_id = u.id
INNER JOIN user_membership_details umd ON umd.user_membership_id = um.id
WHERE u.email = 'integration-test-null-until@example.com'
  AND umd.valid_until IS NULL;
