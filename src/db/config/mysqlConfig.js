const fs = require('fs');
const path = require('path');

let cert = path.join(__dirname, '../certs/ap-southeast-1-bundle.pem');
module.exports = {
  master: {
    host: process.env.MYSQL_MASTER_HOST,
    user: process.env.MYSQL_MASTER_USERNAME,
    password: process.env.MYSQL_MASTER_PASSWORD,
    database: process.env.MYSQL_MASTER_DATABASE,
    port: process.env.MYSQL_MASTER_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+00:00', // UTC+0
    ssl: {
      ca: fs.readFileSync(cert),
      rejectUnauthorized: false
    }
  },
  slave: {
    host: process.env.MYSQL_SLAVE_HOST,
    user: process.env.MYSQL_SLAVE_USERNAME,
    password: process.env.MYSQL_SLAVE_PASSWORD,
    database: process.env.MYSQL_SLAVE_DATABASE,
    port: process.env.MYSQL_SLAVE_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+00:00', // UTC+0
    ssl: {
      ca: fs.readFileSync(cert),
      rejectUnauthorized: false
    }
  }
};