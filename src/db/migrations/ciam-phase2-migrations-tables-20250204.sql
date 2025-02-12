-- Table: emp_membership_user_accounts
CREATE TABLE `emp_membership_user_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` int DEFAULT NULL,
  `first_name` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `newsletter` tinyint(1) DEFAULT NULL,
  `country` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone_number` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_salt` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `picked` tinyint(1) DEFAULT NULL COMMENT '0: no, 1: yes, 2: failed, 3: exist',
  `register_time` datetime DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email_customer_id` (`email`,`customer_id`),
  KEY `idx_email` (`email`),
  KEY `idx_customer_id` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: emp_membership_user_passes
CREATE TABLE `emp_membership_user_passes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pass_id` int DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `pass_type` varchar(12) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'FOM,FOBP...',
  `visual_id` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pass_no` int DEFAULT NULL,
  `category_type` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `item_name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `adult_qty` tinyint(1) DEFAULT NULL,
  `child_qty` tinyint DEFAULT NULL,
  `parking` tinyint(1) DEFAULT NULL,
  `iu` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `car_plate` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `valid_from` datetime DEFAULT NULL,
  `valid_until` datetime DEFAULT NULL,
  `plu` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `member_first_name` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `member_last_name` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `member_email` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `member_dob` datetime DEFAULT NULL,
  `member_identification_no` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `member_phone_number` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `picked` tinyint(1) DEFAULT NULL COMMENT '0: no, 1: yes',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email_customer_pass_visual` (`email`,`customer_id`,`pass_id`,`visual_id`),
  KEY `idx_email` (`email`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_visual_id` (`visual_id`),
  KEY `idx_pass_id` (`pass_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: emp_membership_user_passes_co_member
CREATE TABLE `emp_membership_user_passes_co_member` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pass_id` int DEFAULT NULL,
  `co_member_first_name` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `co_member_last_name` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `co_member_dob` datetime DEFAULT NULL,
  `applicant_type` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'adult | child',
  `picked` tinyint(1) DEFAULT NULL COMMENT '0: no, 1: yes',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pass_id` (`pass_id`),
  KEY `idx_picked` (`picked`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
