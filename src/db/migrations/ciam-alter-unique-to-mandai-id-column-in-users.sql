ALTER TABLE users
  MODIFY mandai_id VARCHAR(32) NOT NULL,
  ADD UNIQUE KEY uniq_mandai_id (mandai_id);
