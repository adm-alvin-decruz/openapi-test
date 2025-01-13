DELETE FROM user_credentials WHERE user_id = (SELECT id FROM users WHERE email='djbyrnes@me.com');
DELETE FROM user_details WHERE user_id = (SELECT id FROM users WHERE email='djbyrnes@me.com');
DELETE FROM user_newsletters WHERE user_id = (SELECT id FROM users WHERE email='djbyrnes@me.com');
DELETE FROM user_memberships WHERE user_id = (SELECT id FROM users WHERE email='djbyrnes@me.com');
DELETE FROM users WHERE email='djbyrnes@me.com';