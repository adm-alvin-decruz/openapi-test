CREATE TABLE `switches` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'eg, multi_package',
  `switch` tinyint(1) NOT NULL DEFAULT '0' COMMENT '0: off, 1: on',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `switches_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `switches` (`name`, `switch`, `description`, `created_at`, `updated_at`)
VALUES
	('signup_gen_passkit', '1', 'Generate passkit for user signup, true/false', '2024-09-18 11:32:49', '2024-09-18 11:32:49'),
	('signup_email_passkit', '1', 'Send welcome email with passkit link', '2024-09-18 11:32:49', '2024-09-18 11:32:49'),
	('wp_phase1a', '1', 'Wildpass Phase1A', '2024-09-25 15:46:28', '2024-09-25 15:46:28'),
	('wp_phase1b', '1', 'Wildpass Phase1B', '2024-09-25 15:46:28', '2024-09-25 15:46:28');
