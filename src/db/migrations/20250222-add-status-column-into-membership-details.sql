ALTER TABLE user_membership_details ADD status tinyint(2) DEFAULT NULL COMMENT '0: pending,1: active,2: expired,3: terminated';
