-- Create syntax for TABLE 'app_tokens'
CREATE TABLE `app_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'GALAXY',
  `credentials` json DEFAULT NULL,
  `token` json DEFAULT NULL,
  `configuration` json DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `client_UNIQUE` (`client`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create syntax for TABLE 'users'
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(256) COLLATE utf8mb4_general_ci NOT NULL,
  `given_name` varchar(256) COLLATE utf8mb4_general_ci NOT NULL,
  `family_name` varchar(256) COLLATE utf8mb4_general_ci NOT NULL,
  `birthdate` timestamp NOT NULL,
  `mandai_id` varchar(32) COLLATE utf8mb4_general_ci NOT NULL,
  `source` tinyint DEFAULT NULL COMMENT 'ORGANIC:1, TICKETING:2, GLOBALTIX:3',
  `active` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_email_mandai_id` (`email`,`mandai_id`),
  KEY `idx_email` (`email`),
  KEY `idx_mandai_id` (`mandai_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create syntax for TABLE 'user_credentials'
CREATE TABLE `user_credentials` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `username` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `tokens` json DEFAULT NULL COMMENT 'tokens and expiration date',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_id_username` (`user_id`,`username`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_username` (`username`),
  CONSTRAINT `user_credentials_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create syntax for TABLE 'user_details'
CREATE TABLE `user_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `phone_number` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'phone',
  `zoneinfo` varchar(3) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'country code',
  `address` varchar(256) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'address',
  `picture` varchar(512) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'profile image links',
  `vehicle_iu` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'vehicle identity unit number',
  `vehicle_plate` varchar(24) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'vehicle plate number',
  `extra` json DEFAULT NULL COMMENT 'extra fields that can be added into JSON',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_id_phone_number` (`user_id`,`phone_number`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_phone_number` (`phone_number`),
  CONSTRAINT `user_details_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create syntax for TABLE 'user_memberships'
CREATE TABLE `user_memberships` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `name` varchar(24) COLLATE utf8mb4_general_ci NOT NULL,
  `visual_id` varchar(32) COLLATE utf8mb4_general_ci NOT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_id_name_visual_id` (`user_id`,`name`,`visual_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_visual_id` (`visual_id`),
  CONSTRAINT `user_memberships_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create syntax for TABLE 'user_newsletters'
CREATE TABLE `user_newsletters` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `name` varchar(24) COLLATE utf8mb4_general_ci NOT NULL,
  `type` tinyint DEFAULT NULL COMMENT 'wildpass: 1',
  `subscribe` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_id_name_type` (`user_id`,`name`,`type`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_name` (`name`),
  CONSTRAINT `user_newsletters_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
