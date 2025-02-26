INSERT INTO `configs` (`config`, `key`, `value`, `created_at`, `updated_at`)
VALUES
	('membership-passes', 'pass-type-mapping', '{\"fom\": \"fom\", \"fow\": \"fow\", \"fobp\": \"fobp\", \"fomp\": \"fomp\", \"fons\": \"fons\", \"fors\": \"fors\", \"fosz\": \"fosz\", \"fowp\": \"fowp\", \"forfwa\": \"forfwa\"}', '2025-02-02 18:07:15', '2025-02-02 18:07:15'),
	('membership-passes', 'pass-type', '[\"fosz\", \"fobp\", \"fons\", \"fors\", \"fow\", \"fowp\", \"forfwa\", \"fom\", \"fomp\"]', '2025-02-02 18:07:15', '2025-02-02 18:07:15');


INSERT INTO `app_tokens` (`client`, `credentials`, `token`, `configuration`, `expires_at`, `created_at`, `updated_at`)
VALUES
	('nopCommerce', '{\"client_id\": \"membership_secret_key\", \"grant_type\": \"client_credentials\", \"client_secret\": \"fa7xt2ak1g7i1cb1r7h118j114gf9\"}', NULL, '{\"storeId\": \"1\"}', NULL, NULL, NULL);
