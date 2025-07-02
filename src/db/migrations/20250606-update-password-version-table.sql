-- indexes for optimal query performance
CREATE INDEX `idx_user_version` ON `password_versions` (`user_id`, `version`);
CREATE INDEX `idx_user_active` ON `password_versions` (`user_id`, `is_active`);
CREATE INDEX `idx_created_at` ON `password_versions` (`created_at`);

-- If no duplicates exist, create the unique constraint:
ALTER TABLE `password_versions`
ADD CONSTRAINT `uk_user_version` UNIQUE (`user_id`, `version`);

-- change version from varchar to int
ALTER TABLE `password_versions` MODIFY COLUMN `version` int NOT NULL;
-- make password_hash NOT NULL and optimize length
ALTER TABLE `password_versions` MODIFY COLUMN `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

-- Change datetime to timestamp
ALTER TABLE `password_versions`
MODIFY COLUMN `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
MODIFY COLUMN `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

