require('dotenv').config();
const { DataSource } = require('typeorm');
const { getDbConfig } = require('../config/mysqlConfig');
const User = require('./entities/User.entity');

let dataSource = null;

/**
 * Initialize TypeORM DataSource
 * Sử dụng cùng config với mysqlConn.js để đảm bảo consistency
 */
async function getDataSource() {
  if (dataSource && dataSource.isInitialized) {
    return dataSource;
  }

  const dbConfig = await getDbConfig();
  
  // TypeORM sẽ dùng slave pool cho read operations
  dataSource = new DataSource({
    type: 'mysql',
    host: dbConfig.slave.host,
    port: parseInt(dbConfig.slave.port) || 3306,
    username: dbConfig.slave.user,
    password: dbConfig.slave.password,
    database: dbConfig.slave.database,
    entities: [User],
    synchronize: false, // QUAN TRỌNG: Không auto-sync, dùng migration riêng
    logging: process.env.NODE_ENV === 'development', // Log queries trong dev
    extra: {
      ssl: dbConfig.slave.ssl,
      connectionLimit: dbConfig.slave.connectionLimit || 10,
    },
    timezone: '+00:00', // UTC
  });

  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  return dataSource;
}

/**
 * Close DataSource connection (dùng khi shutdown Lambda)
 */
async function closeDataSource() {
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
    dataSource = null;
  }
}

module.exports = {
  getDataSource,
  closeDataSource,
};

