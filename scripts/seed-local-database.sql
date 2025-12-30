-- Seed database for local development
-- This script seeds essential switches and configs needed for local testing
-- Run this after setting up the local database

-- ============================================
-- SWITCHES
-- ============================================

-- Insert or update api_key_validation switch (set to 0 to disable validation in local)
INSERT INTO `switches` (`name`, `switch`, `description`, `created_at`, `updated_at`)
VALUES ('api_key_validation', 0, 'Enable API Key Validation - Set to 0 for local development', NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  `switch` = 0,
  `description` = 'Enable API Key Validation - Set to 0 for local development',
  `updated_at` = NOW();

-- Insert or update email_domain_check switch (optional, for email domain validation)
INSERT INTO `switches` (`name`, `switch`, `description`, `created_at`, `updated_at`)
VALUES ('email_domain_check', 0, 'Enable email domain check - Set to 0 for local development', NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  `switch` = 0,
  `description` = 'Enable email domain check - Set to 0 for local development',
  `updated_at` = NOW();

-- ============================================
-- CONFIGS
-- ============================================

-- Insert or update app_id_key_binding config (for API key validation)
-- This is a minimal config for local development
-- In production, this would contain mappings for all app IDs
INSERT INTO `configs` (`config`, `key`, `value`, `created_at`, `updated_at`)
VALUES (
  'app_id',
  'app_id_key_binding',
  '[{"local.dev.test.ciam": {"binding": false, "lambda_api_key": "TEST_API_KEY"}}]',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE 
  `value` = '[{"local.dev.test.ciam": {"binding": false, "lambda_api_key": "TEST_API_KEY"}}]',
  `updated_at` = NOW();

-- Insert or update APP_ID_DEV config (for app-config service)
-- This contains list of valid app IDs for DEV environment
INSERT INTO `configs` (`config`, `key`, `value`, `created_at`, `updated_at`)
VALUES (
  'app-config',
  'APP_ID_DEV',
  JSON_ARRAY(
    'aemDev.com.mandaiapi.ciam',
    'gltDev.com.mandaiapi.ciam',
    'tktDev.com.mandaiapi.ciam',
    'passkit.Dev.internal.mandaiapi.ciam',
    'rePassMicroSite.Dev.internal.mandaiapi.ciam',
    'nopComm.Dev.service.mandaiapi.ciam',
    'loginMicroSite.Dev.internal.mandaiapi.ciam',
    'mfaMobile.Dev.service.mandaiapi.ciam',
    'cliteOnline.dev.internal.mandai.com',
    'entsvcDev.com.mandaiapi.ciam',
    'apexDev.service.mandaiapi.ciam',
    'local.dev.test.ciam'
  ),
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `value` = JSON_ARRAY(
    'aemDev.com.mandaiapi.ciam',
    'gltDev.com.mandaiapi.ciam',
    'tktDev.com.mandaiapi.ciam',
    'passkit.Dev.internal.mandaiapi.ciam',
    'rePassMicroSite.Dev.internal.mandaiapi.ciam',
    'nopComm.Dev.service.mandaiapi.ciam',
    'loginMicroSite.Dev.internal.mandaiapi.ciam',
    'mfaMobile.Dev.service.mandaiapi.ciam',
    'cliteOnline.dev.internal.mandai.com',
    'entsvcDev.com.mandaiapi.ciam',
    'apexDev.service.mandaiapi.ciam',
    'local.dev.test.ciam'
  ),
  `updated_at` = NOW();

