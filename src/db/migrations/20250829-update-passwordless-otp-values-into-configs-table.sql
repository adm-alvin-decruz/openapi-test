UPDATE `configs`
SET `value` = JSON_OBJECT(
      'otp_length', 6,
      'otp_cooldown_interval', 60,
      'otp_max_generate', 5,
      'otp_max_attempt', 5,
      'otp_login_expiry', 600,
      'otp_signup_expiry', 600,
      'otp_login_disabled', 900
    ),
    `updated_at` = NOW()
WHERE `config` = 'passwordless-otp'
  AND `key` = 'otp-config';