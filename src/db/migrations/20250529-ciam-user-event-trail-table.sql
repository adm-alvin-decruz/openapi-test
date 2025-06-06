CREATE TABLE `user_event_audit_trail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `email` varchar(256) COLLATE utf8mb4_general_ci NOT NULL,
  `event_type` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'signup, update',
  `data` json DEFAULT NULL,
  `source` tinyint DEFAULT NULL COMMENT '1: CIAM API, 2: NC API, 3: AEM API, 4: Support API, 5: Service Portal, 6: MFA, 7: My Account, 8: Commerce',
  `status` tinyint DEFAULT NULL COMMENT '0: failed, 1: success',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),

  -- composite indexes for common query patterns
  KEY `idx_user_created` (`user_id`, `created_at`),
  KEY `idx_email_created` (`email`, `created_at`),
  KEY `idx_event_status_created` (`event_type`, `status`, `created_at`),
  KEY `idx_source_created` (`source`, `created_at`),

  -- single column indexes for specific lookups
  KEY `idx_created_at` (`created_at`),
  KEY `idx_status` (`status`),

  -- covering index for audit reports (adjust columns based on your SELECT queries)
  KEY `idx_audit_summary` (`user_id`, `event_type`, `status`, `created_at`, `source`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
COMMENT='Audit trail for user events and activities';