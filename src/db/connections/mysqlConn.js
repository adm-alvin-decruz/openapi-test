const mysql = require('mysql2/promise');
const dbConfig = require('../config/mysqlConfig');

const masterPool = mysql.createPool(dbConfig.master);
const slavePool = mysql.createPool(dbConfig.slave);

module.exports = {
  query: async (sql, params) => {
    const [rows, fields] = await slavePool.query(sql, params);
    return rows;
  },
  execute: async (sql, params) => {
    const [result] = await masterPool.execute(sql, params);
    return result;
  }
};