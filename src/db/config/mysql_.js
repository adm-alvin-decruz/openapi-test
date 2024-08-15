const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z', // Set timezone to UTC
});

const config = {
  master: {
    host: process.env.MYSQL_MASTER_HOST,
    user: process.env.MYSQL_MASTER_USERNAME,
    password: process.env.MYSQL_MASTER_PASSWORD,
    database: process.env.MYSQL_MASTER_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z', // Set timezone to UTC
  },
  slave: {
    host: 'slave-host',
    user: 'username',
    password: 'password',
    database: 'database_name',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z', // Set timezone to UTC
  },
};

const userModel = new UserModel(config);
const userMembershipModel = new UserMembershipModel(config);
const userNewsletterModel = new UserNewsletterModel(config);
const userDetailModel = new UserDetailModel(config);
const userCredentialModel = new UserCredentialModel(config);
