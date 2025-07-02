CREATE TABLE `password_versions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `version` varchar(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `password_versions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- switch seed
INSERT INTO `switches` (`name`, `switch`, `description`, `created_at`, `updated_at`)
VALUES
	('enable_password_versioning', '0', 'Password versioning feature switch', now(), now());

INSERT INTO `configs` (`config`, `key`, `value`, `created_at`, `updated_at`)
VALUES
	('password_versioning_conf', 'version', '6', now(), now());

INSERT INTO `switches` (`name`, `switch`, `description`, `created_at`, `updated_at`)
VALUES
	('enable_check_password_complexity', '0', 'Enable check password complexity base on IT policy suggestion', '2025-07-01 15:19:39', '2025-07-01 15:19:39');
