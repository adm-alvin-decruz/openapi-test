-- introduce passwordless table
CREATE TABLE `passwordless_tokens` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `hash` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `salt` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `expires_at` TIMESTAMP NULL DEFAULT NULL,
  `verification_attempts` INT NOT NULL DEFAULT 0,
  `is_valid` TINYINT NOT NULL DEFAULT 1 COMMENT '0: invalid; 1: valid',
  `aws_session` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `switches` (`name`, `switch`, `description`, `created_at`, `updated_at`)
VALUES
    ('passwordless_enable_send_sign_up_email', '0', 'Passwordless send email sign up', '2024-09-18 11:32:49', '2024-09-27 16:43:57'),
    ('passwordless_enable_send_otp', '0', 'Passwordless send OTP', '2024-09-18 11:32:49', '2024-09-27 16:43:39'),
    ('passwordless_enable_otp_use_alphanumeric', '0', 'Passwordless OTP use alphanumeric', '2024-09-18 11:32:49', '2024-09-27 16:43:39');

INSERT INTO `configs` (`config`, `key`, `value`, `created_at`, `updated_at`)
VALUES
    ('passwordless-otp', 'otp-config', '{"otp_interval": 10, "otp_length": 6, "otp_signup_expiry": 10, "otp_login_expiry": 10, "otp_max_attempt": 5}', '2025-02-02 18:07:15', '2025-02-02 18:07:15');
