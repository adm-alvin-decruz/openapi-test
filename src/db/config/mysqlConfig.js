const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { getDbSecrets } = require("../../services/secretsService");
dotenv.config();

let cert = path.join(__dirname, "../certs/ap-southeast-1-bundle.pem");

const dbSecrets = getDbSecrets();

module.exports = {
  master: {
    host: process.env.MYSQL_MASTER_HOST,
    user: dbSecrets.db_user,
    password: dbSecrets.db_password,
    database: process.env.MYSQL_MASTER_DATABASE,
    port: process.env.MYSQL_MASTER_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: "+00:00", // UTC+0
    ssl: {
      ca: fs.readFileSync(cert),
      rejectUnauthorized: false,
    },
  },
  slave: {
    host: process.env.MYSQL_SLAVE_HOST,
    user: dbSecrets.db_user,
    password: dbSecrets.db_password,
    database: process.env.MYSQL_SLAVE_DATABASE,
    port: process.env.MYSQL_SLAVE_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: "+00:00", // UTC+0
    ssl: {
      ca: fs.readFileSync(cert),
      rejectUnauthorized: false,
    },
  },
};
