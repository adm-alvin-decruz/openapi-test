-- switch seed
INSERT INTO `switches` (`name`, `switch`, `description`, `created_at`, `updated_at`)
VALUES
	('enable_password_versioning_private_endpoint', '1', 'Password versioning feature switch Private Endpoint', now(), now());

INSERT INTO `switches` (`name`, `switch`, `description`, `created_at`, `updated_at`)
VALUES
	('enable_check_password_complexity_private_endpoint', '1', 'Enable check password complexity base on IT policy suggestion Private Endpoint', now(), now());
