const mysql = require("mysql2/promise");
const { getDbConfig } = require("../config/mysqlConfig");

let masterPool, slavePool;

async function initDb() {
  const dbConfig = await getDbConfig();
  masterPool = mysql.createPool(dbConfig.master);
  slavePool = mysql.createPool(dbConfig.slave);
}

async function query(sql, params) {
  if (!slavePool) await initDb();
  const [rows] = await slavePool.query(sql, params);
  return rows;
}

async function execute(sql, params) {
  if (!masterPool) await initDb();
  const [result] = await masterPool.execute(sql, params);
  return result;
}

async function transaction(work) {
  if (!masterPool) await initDb();
  const connection = await masterPool.getConnection();
  try {
    await connection.beginTransaction();
    await Promise.all(work.map((unit) => connection.query(unit)));
    await connection.commit();
  } catch (err) {
    console.log("rollback");
    await connection.rollback();
    throw err;
  } finally {
    console.log("release");
    connection.release();
  }
}

module.exports = { query, execute, transaction };
