ALTER TABLE passkit_passes
MODIFY COLUMN expiry_date DATE NULL,
MODIFY COLUMN membership_type VARCHAR(100) NULL,
MODIFY COLUMN family_members JSON NULL;