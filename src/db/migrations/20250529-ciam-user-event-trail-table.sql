CREATE TABLE `users_event_audit_trail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` INT NULL DEFAULT NULL,
  `email` NOT NULL,
  `event_type` varchar(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'signup, update',
  `data` json DEFAULT NULL,
  `source` tinyint DEFAULT NULL COMMENT '1: CIAM API, 2: NC API, 3: AEM API, 4: Support API, 5: Service Portal, 6: MFA, 7: My Account, 8: Commerce',
  `status` tinyint DEFAULT NULL COMMENT '0: failed, 1: success',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX idx_email (email),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
