CREATE TABLE `failed_jobs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data` json DEFAULT NULL,
  `source` tinyint DEFAULT NULL COMMENT '1: sqs, 2: ciam_main, 3: passkit',
  `triggered_at` datetime(3) DEFAULT NULL,
  `status` tinyint DEFAULT NULL COMMENT '0:new, 1: re-triggered, 2:success, 3: failed',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_job_identifier` (`uuid`,`name`,`action`,`source`),
  KEY `idx_uuid` (`uuid`),
  KEY `idx_name` (`name`),
  KEY `idx_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;