#!/usr/bin/env node
/**
 * Generate sam-env.json from local.env file
 * This allows SAM to use environment variables from the centralized local.env file
 */

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = path.resolve(__dirname, '..');
const ENV_FILE = path.join(PROJECT_DIR, 'local.env');
const SAM_ENV_FILE = path.join(PROJECT_DIR, 'sam-env.json');

// Read local.env file
if (!fs.existsSync(ENV_FILE)) {
  console.error(`❌ Error: ${ENV_FILE} not found`);
  process.exit(1);
}

const envContent = fs.readFileSync(ENV_FILE, 'utf8');
const envVars = {};

// Parse .env file
envContent.split('\n').forEach((line) => {
  // Skip comments and empty lines
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return;
  }

  // Parse KEY=VALUE
  const match = trimmed.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    envVars[key] = value;
  }
});

// Validate required environment variables
// USER_POOL_ID must be set in local.env - no hardcoded fallback for security
if (!envVars.USER_POOL_ID) {
  console.error('❌ Error: USER_POOL_ID is required in local.env');
  console.error('   Please set USER_POOL_ID in your local.env file');
  process.exit(1);
}

// Create SAM env structure
// Note: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are NOT included here
// They will be automatically passed from AWS profile via --profile flag
// This ensures real AWS credentials are used for Cognito connection
const samEnv = {
  CiamApiFunction: {
    APP_ENV: envVars.APP_ENV || 'dev',
    IS_LOCAL: envVars.IS_LOCAL || 'true',
    SAM_LOCAL: envVars.SAM_LOCAL || 'true',
    APP_LOG_SWITCH: envVars.APP_LOG_SWITCH || 'true',
    PARAMETERS_SECRETS_EXTENSION_HTTP_PORT: envVars.PARAMETERS_SECRETS_EXTENSION_HTTP_PORT || '4566',
    MYSQL_MASTER_HOST: envVars.MYSQL_MASTER_HOST || 'host.docker.internal',
    MYSQL_MASTER_PORT: envVars.MYSQL_MASTER_PORT || '3306',
    MYSQL_MASTER_DATABASE: envVars.MYSQL_MASTER_DATABASE || 'ciam_dev',
    MYSQL_SLAVE_HOST: envVars.MYSQL_SLAVE_HOST || 'host.docker.internal',
    MYSQL_SLAVE_PORT: envVars.MYSQL_SLAVE_PORT || '3306',
    MYSQL_SLAVE_DATABASE: envVars.MYSQL_SLAVE_DATABASE || 'ciam_dev',
    AWS_REGION: envVars.AWS_REGION || 'ap-southeast-1',
    AWS_REGION_NAME: envVars.AWS_REGION_NAME || 'ap-southeast-1',
    // AWS credentials are NOT set here - they come from AWS profile via --profile flag
    // This allows SAM to use real AWS credentials for Cognito connection
    USER_POOL_ID: envVars.USER_POOL_ID,
    USE_LOCALSTACK: envVars.USE_LOCALSTACK || 'true',
    LOCALSTACK_ENDPOINT: envVars.LOCALSTACK_ENDPOINT || 'http://host.docker.internal:4566',
    NODE_ENV: envVars.NODE_ENV || 'dev',
  },
};

// Write sam-env.json
fs.writeFileSync(SAM_ENV_FILE, JSON.stringify(samEnv, null, 2));
console.log(`✅ Generated ${SAM_ENV_FILE} from ${ENV_FILE}`);

