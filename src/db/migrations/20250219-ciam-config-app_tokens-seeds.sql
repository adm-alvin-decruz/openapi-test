INSERT INTO `configs` (`config`, `key`, `value`, `created_at`, `updated_at`)
VALUES
	('membership-passes', 'pass-type-mapping', '{\"FOM\": \"FOM\", \"FOW\": \"FOW\", \"FOBP\": \"FOBP\", \"FOMP\": \"FOMP\", \"FONS\": \"FONS\", \"FORS\": \"FORS\", \"FOSZ\": \"FOSZ\", \"FOWP\": \"FOW+\", \"FORFWA\": \"FORFWA\"}', '2025-02-02 18:07:15', '2025-02-02 18:07:15'),
	('membership-passes', 'pass-type', '[\"FOSZ\", \"FOBP\", \"FONS\", \"FORS\", \"FOW\", \"FOWP\", \"FORFWA\", \"FOM\", \"FOMP\"]', '2025-02-02 18:07:15', '2025-02-02 18:07:15');


INSERT INTO `app_tokens` (`client`, `credentials`, `token`, `configuration`, `expires_at`, `created_at`, `updated_at`)
VALUES
	('nopCommerce', '{\"client_id\": \"membership_secret_key\", \"grant_type\": \"client_credentials\", \"client_secret\": \"fa7xt2ak1g7i1cb1r7h118j114gf9\"}', NULL, '{\"storeId\": \"1\"}', NULL, NULL, NULL);
