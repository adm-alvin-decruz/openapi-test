-- Add otp_email_disabled_until column to users table
-- This field is used to temporarily disable OTP email sending for troubleshooting purposes
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS otp_email_disabled_until DATETIME NULL DEFAULT NULL COMMENT 'Timestamp until which OTP email sending is disabled for troubleshooting';
