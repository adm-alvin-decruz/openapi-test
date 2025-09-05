ALTER TABLE user_credentials
  ADD COLUMN passwordless_bridge_pw_enc TEXT NULL AFTER password_hash,
  ADD COLUMN passwordless_bridge_pw_set_at TIMESTAMP NULL DEFAULT NULL AFTER passwordless_bridge_pw_enc;
