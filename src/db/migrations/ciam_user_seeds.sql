CREATE USER 'usr_ciam1'@'%' IDENTIFIED BY 'EQuPqYpeR7XjmGSLFk';
CREATE USER 'usr_ciam2'@'%' IDENTIFIED BY '8SbvjCk9QNfq3L72d5';

GRANT ALL ON ciam.* TO 'usr_ciam1'@'%';
GRANT ALL ON ciam.* TO 'usr_ciam2'@'%';

FLUSH PRIVILEGES;