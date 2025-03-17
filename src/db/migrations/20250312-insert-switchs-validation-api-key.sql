-- insert api_key_validation
INSERT INTO `switches` (`name`, `switch`, `description`, `created_at`, `updated_at`)
VALUES ('api_key_validation', true, 'enable API Key Validation', NOW(), NOW())

INSERT INTO `switches` (`name`, `switch`, `description`, `created_at`, `updated_at`)
VALUES
	('migration_update_existing_user', '1', 'Migration update existing user', '2025-03-15 12:31:44', '2025-03-15 12:31:44');
