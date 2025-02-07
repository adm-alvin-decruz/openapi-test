CREATE TABLE passkit_devices (
    id INT(11) NOT NULL AUTO_INCREMENT,
    device_library_identifier VARCHAR(64) NOT NULL,
    push_token VARCHAR(128) NOT NULL,
    created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY (device_library_identifier),
    KEY idx_device_id (device_library_identifier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE passkit_passes (
    id INT(11) NOT NULL AUTO_INCREMENT,
    pass_type_identifier VARCHAR(128) NOT NULL,
    serial_number VARCHAR(32) NOT NULL,
    pass_type VARCHAR(16) NOT NULL,
    mandai_id VARCHAR(32) NOT NULL,
    created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_pass (pass_type, serial_number),
    KEY idx_pass_type_id (pass_type_identifier),
    KEY idx_serial_number (serial_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE passkit_registrations (
    id INT(11) NOT NULL AUTO_INCREMENT,
    device_id INT(11) NOT NULL,
    pass_id INT(11) NOT NULL,
    created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_device_pass (device_id, pass_id),
    KEY idx_device_id (device_id),
    KEY idx_pass_id (pass_id),
    CONSTRAINT fk_device_id FOREIGN KEY (device_id) REFERENCES passkit_devices(id),
    CONSTRAINT fk_pass_id FOREIGN KEY (pass_id) REFERENCES passkit_passes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;