-- Table: emp_membership_user_accounts
CREATE TABLE emp_membership_user_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(256) NOT NULL,
    customer_id INT(11) NULL,
    first_name VARCHAR(256) NULL,
    last_name VARCHAR(256) NULL,
    newsletter BOOLEAN NULL,
    country VARCHAR(3) NULL,
    phone_number VARCHAR(32) NULL,
    password_hash VARCHAR(255) NULL,
    password_salt VARCHAR(255) NULL,
    picked BOOLEAN NULL COMMENT '0: no, 1: yes',
    register_time DATETIME NULL,
    last_login DATETIME NULL,
    created_at DATETIME NULL,
    updated_at DATETIME NULL,

    UNIQUE KEY uk_email_customer_id (email, customer_id),
    INDEX idx_email (email),
    INDEX idx_customer_id (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: emp_membership_user_passes
CREATE TABLE emp_membership_user_passes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(256) NOT NULL,
    pass_id INT(11) NULL,
    customer_id INT(11) NULL,
    pass_type VARCHAR(12) NULL COMMENT 'FOM,FOBP...',
    visual_id VARCHAR(32) NULL,
    pass_no INT(11) NULL,
    category_type VARCHAR(128) NULL,
    item_name VARCHAR(128) NULL,
    adult_qty TINYINT(1) NULL,
    child_qty TINYINT(2) NULL,
    parking TINYINT(1) NULL,
    iu VARCHAR(24) NULL,
    car_plate VARCHAR(24) NULL,
    valid_from DATETIME NULL,
    valid_until DATETIME NULL,
    plu VARCHAR(256) NULL,
    member_first_name VARCHAR(256) NULL,
    member_last_name VARCHAR(256) NULL,
    member_email VARCHAR(256) NULL,
    member_dob DATETIME NULL,
    member_identification_no VARCHAR(10) NULL,
    member_phone_number VARCHAR(256) NULL,
    picked BOOLEAN NULL COMMENT '0: no, 1: yes',
    created_at DATETIME NULL,
    updated_at DATETIME NULL,

    UNIQUE KEY uk_email_customer_pass_visual (email, customer_id, pass_id, visual_id),
    INDEX idx_email (email),
    INDEX idx_customer_id (customer_id),
    INDEX idx_visual_id (visual_id),
    INDEX idx_pass_id (pass_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: emp_membership_user_passes_co_member
CREATE TABLE emp_membership_user_passes_co_member (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pass_id INT(11) NULL,
    co_member_first_name VARCHAR(256) NULL,
    co_member_last_name VARCHAR(256) NULL,
    co_member_dob DATETIME NULL,
    applicant_type VARCHAR(24) NULL COMMENT 'adult | child',
    picked BOOLEAN NULL COMMENT '0: no, 1: yes',
    created_at DATETIME NULL,
    updated_at DATETIME NULL,

    UNIQUE KEY uk_pass_id (pass_id),
    INDEX idx_pass_id (pass_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;