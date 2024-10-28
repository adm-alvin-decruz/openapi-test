ALTER TABLE users MODIFY birthdate DATETIME;
ALTER TABLE user_credentials MODIFY last_login DATETIME;
ALTER TABLE user_memberships MODIFY expires_at DATETIME;
ALTER TABLE app_tokens MODIFY expires_at DATETIME;