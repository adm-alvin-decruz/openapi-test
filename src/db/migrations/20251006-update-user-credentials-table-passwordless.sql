ALTER TABLE `user_credentials`
  ADD COLUMN `status` tinyint NOT NULL DEFAULT 1 COMMENT '0: inactive; 1: active',
  ADD COLUMN `reset_at` timestamp NULL DEFAULT NULL COMMENT 'Timestamp to re-enable passwordless login';