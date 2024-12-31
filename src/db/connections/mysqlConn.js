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
  },
  transaction: async (work) => {
    const connection = await masterPool.getConnection();
    try {
      await connection.beginTransaction();
      await Promise.all(work.map(unit => connection.query(unit)));
      console.log('commit');
      await connection.commit();
      masterPool.releaseConnection(connection);
    }
    catch (error) {
      console.log('rollback');
      await connection.rollback();
      masterPool.releaseConnection(connection);
      throw error;
    } finally {
      masterPool.releaseConnection(connection);
    }
  }
};
