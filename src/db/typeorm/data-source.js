// Import reflect-metadata shim BEFORE TypeORM DataSource
// TypeORM 0.3.x requires reflect-metadata to be loaded before creating DataSource
require('reflect-metadata');
require('dotenv').config();
const { DataSource } = require('typeorm');
const { getDbConfig } = require('../config/mysqlConfig');
const { User } = require('./entities/User.entity');

let dataSource = null;

async function getDataSource() {
  if (dataSource && dataSource.isInitialized) {
    return dataSource;
  }

  const dbConfig = await getDbConfig();
  
  dataSource = new DataSource({
    type: 'mysql',
    host: dbConfig.slave.host,
    port: parseInt(dbConfig.slave.port) || 3306,
    username: dbConfig.slave.user,
    password: dbConfig.slave.password,
    database: dbConfig.slave.database,
    entities: [User],
    synchronize: false, 
    logging: process.env.NODE_ENV === 'development',
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

