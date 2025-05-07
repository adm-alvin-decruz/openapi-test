CREATE TABLE `password_version` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(11) COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` varchar(11) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES users(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
