#!/usr/bin/env node

/**
 * Script to seed switches and configs into MySQL database for local development
 * Usage: node scripts/seed-local-database.js
 * Make sure MySQL is running first: npm run docker:up
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Load environment variables from local.env
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', 'local.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Error: local.env file not found');
    console.error('   Please copy local.env.example to local.env and configure it');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};

  envContent.split('\n').forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return envVars;
}

async function seedDatabase() {
  const env = loadEnvFile();

  // Get MySQL configuration from environment
  const dbConfig = {
    host: env.MYSQL_MASTER_HOST || 'localhost',
    port: parseInt(env.MYSQL_MASTER_PORT || '3306', 10),
    user: env.MYSQL_USER || 'ciam_user',
    password: env.MYSQL_PASSWORD || 'ciam_password',
    database: env.MYSQL_MASTER_DATABASE || env.MYSQL_DATABASE || 'ciam_dev',
    multipleStatements: true,
  };

  // Adjust host for local development (host.docker.internal -> localhost)
  if (dbConfig.host === 'host.docker.internal') {
    dbConfig.host = 'localhost';
  }

  console.log('🌱 Seeding database (switches and configs) for local development...');
  console.log(`📍 Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`🗄️  Database: ${dbConfig.database}`);
  console.log(`👤 User: ${dbConfig.user}`);
  console.log('');

  let connection;

  try {
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    console.log('');

    // Read SQL file
    const sqlPath = path.join(__dirname, 'seed-local-database.sql');
    if (!fs.existsSync(sqlPath)) {
      console.error(`❌ Error: SQL file not found: ${sqlPath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('📝 Executing SQL statements...');
    console.log('');

    // Execute SQL
    await connection.query(sql);

    console.log('✅ Database seeded successfully!');
    console.log('');

    // Query and display seeded switches
    const [switches] = await connection.query(
      'SELECT name, switch, description FROM switches WHERE name IN (?, ?)',
      ['api_key_validation', 'email_domain_check']
    );

    if (switches.length > 0) {
      console.log('📋 Seeded switches:');
      switches.forEach((switchItem) => {
        const status = switchItem.switch === 0 ? '❌ Disabled' : '✅ Enabled';
        console.log(`   - ${switchItem.name}: ${status}`);
        console.log(`     ${switchItem.description}`);
      });
      console.log('');
    }

    // Query and display seeded configs
    const [configs] = await connection.query(
      `SELECT config, \`key\`, value FROM configs 
       WHERE (config = 'app_id' AND \`key\` = 'app_id_key_binding')
          OR (config = 'app-config' AND \`key\` = 'APP_ID_DEV')`
    );

    if (configs.length > 0) {
      console.log('📋 Seeded configs:');
      configs.forEach((config) => {
        console.log(`   - ${config.config}.${config.key}`);
        try {
          const value = JSON.parse(config.value);
          if (Array.isArray(value)) {
            console.log(`     Value: ${value.length} items`);
          } else {
            console.log(`     Value: ${JSON.stringify(value, null, 2)}`);
          }
        } catch (e) {
          console.error(`     Error parsing value: ${e.message}`);
          console.log(`     Value: ${config.value}`);
        }
      });
    }

    console.log('');
    console.log('✨ Done!');
  } catch (error) {
    console.error('❌ Error seeding database:');
    console.error(`   ${error.message}`);
    console.error('');
    console.error('💡 Make sure:');
    console.error('   1. MySQL container is running: npm run docker:up');
    console.error('   2. Database credentials in local.env are correct');
    console.error('   3. Database exists and is accessible');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedDatabase();

