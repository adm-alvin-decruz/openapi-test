-- Add otp_email_disabled_until column to users table
-- This field is used to temporarily disable OTP email sending for troubleshooting purposes
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS otp_email_disabled_until DATETIME NULL DEFAULT NULL COMMENT 'Timestamp until which OTP email sending is disabled for troubleshooting';

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_otp_email_disabled_until ON users(otp_email_disabled_until);

