-- reset the user migrations table back to empty due to records cannot be re-inserted. Only update allowed.
TRUNCATE user_migrations;

-- reset the picked records to non-pick for the first 20 records
UPDATE wildpass_user_emp SET picked=0 WHERE picked=1;
