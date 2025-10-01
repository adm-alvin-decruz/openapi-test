UPDATE `configs`
SET `value` = JSON_SET(
      `value`,
      '$.otp_interval', 60,
      '$.otp_login_expiry', 300,
      '$.otp_signup_expiry', 600
    ),
    `updated_at` = NOW()
WHERE `config` = 'passwordless-otp'
  AND `key` = 'otp-config';