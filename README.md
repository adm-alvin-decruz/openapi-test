# ciam-microservice

CIAM Cognito API Microservice for Mandai Wildlife Group

---

## Local Development Setup

### Prerequisites

- Node.js 18.x+
- Docker and Docker Compose
- AWS SAM CLI

### Quick Start

1. **Configure environment variables**

   ```bash
   # Copy the example file and update with your actual values
   cp local.env.example local.env
   ```

   - Edit `local.env` and replace placeholders with your actual values
   - This file is the single source of truth for both Docker Compose and SAM
   - **Note:** `local.env` is gitignored and will not be committed

2. **Set up AWS credentials for Cognito connection**

   ```bash
   # Export your AWS profile (required for Cognito connection)
   export AWS_PROFILE=your-profile-name

   # If using AWS SSO, login first:
   aws sso login --profile your-profile-name
   ```

3. **Start Docker services**

   ```bash
   npm run docker:up
   ```

4. **Initialize database schema** (if database is empty)
   To get the latest schema from the test database:

   ```bash
   # 1. Set up AWS SSM port forwarding to test database
   export AWS_PROFILE=your-profile-name
   aws ssm start-session \
       --profile $AWS_PROFILE \
       --target <EC2_INSTANCE_ID> \
       --document-name AWS-StartPortForwardingSessionToRemoteHost \
       --parameters '{"host":["<RDS_ENDPOINT>"],"portNumber":["3306"],"localPortNumber":["3307"]}'

   # 2. In another terminal, dump schema from test database
   mysqldump -h 127.0.0.1 -P 3307 -u <TEST_DB_USER> -p<TEST_DB_PASSWORD> \
       --ssl-mode=REQUIRED \
       --no-data \
       --routines \
       --triggers \
       --single-transaction \
       <TEST_DB_NAME> > schema.sql

   # 3. Import schema into local database
   mysql -h 127.0.0.1 -P 3306 -u <LOCAL_DB_USER> -p<LOCAL_DB_PASSWORD> <LOCAL_DB_NAME> < schema.sql
   ```

   **Note:** Replace placeholders with actual values:
   - `<EC2_INSTANCE_ID>` - EC2 instance ID for SSM port forwarding
   - `<RDS_ENDPOINT>` - RDS endpoint hostname
   - `<TEST_DB_USER>` - Test database username
   - `<TEST_DB_PASSWORD>` - Test database password
   - `<TEST_DB_NAME>` - Test database name
   - `<LOCAL_DB_USER>` - Local database username (from `local.env`)
   - `<LOCAL_DB_PASSWORD>` - Local database password (from `local.env`)
   - `<LOCAL_DB_NAME>` - Local database name (from `local.env`)

5. **Seed secrets into LocalStack** (required for Secrets Manager)

   ```bash
   npm run secrets:seed
   ```

   This will create the following secrets in LocalStack:
   - `ciam-dev-db-user1` - Database credentials
   - `ciam-microservice-lambda-config` - Lambda configuration (SendGrid, Cognito client, etc.)

6. **Seed database** (switches and configs for local development)

   ```bash
   npm run db:seed
   ```

   This will create/update the following in MySQL:

   **Switches:**
   - `api_key_validation` - Set to 0 (disabled) to bypass `mwg-app-id` and `x-api-key` validation
   - `email_domain_check` - Set to 0 (disabled) to bypass email domain validation

   **Configs:**
   - `app_id.app_id_key_binding` - App ID to API key mapping configuration
   - `app-config.APP_ID_DEV` - List of valid app IDs for DEV environment (for app-config service)

7. **Build and run SAM local**
   ```bash
   npm run sam:build
   npm run sam:local
   ```

### Environment Configuration

All environment variables are centralized in `local.env` file:

- **Docker Compose** automatically loads from `local.env`
- **SAM** uses `sam-env.json` which is generated from `local.env` via `npm run sam:env:generate`

**Important: AWS Credentials for Cognito**

- AWS credentials are **NOT** stored in `local.env` or `sam-env.json`
- They are automatically loaded from your AWS profile via `AWS_PROFILE` environment variable
- **`sam build`** - Does NOT require AWS profile (builds code only)
- **`sam local start-api`** - **REQUIRES** AWS profile to pass credentials to container for Cognito connection
- The scripts automatically add `--profile` flag if `AWS_PROFILE` is set
- To use AWS credentials, export `AWS_PROFILE` before running SAM commands:
  ```bash
  export AWS_PROFILE=your-profile-name
  # If using AWS SSO, login first:
  aws sso login --profile your-profile-name
  npm run sam:local
  ```

To update environment variables:

1. Edit `local.env`
2. For SAM: Run `npm run sam:env:generate` (or it runs automatically with `sam:build`, `sam:local`, etc.)

### Available Scripts

**Docker:**

- `npm run docker:up` - Start Docker services
- `npm run docker:down` - Stop Docker services
- `npm run docker:logs` - View logs
- `npm run docker:ps` - Check service status
- `npm run docker:restart` - Restart services

**Secrets:**

- `npm run secrets:seed` - Seed secrets into LocalStack Secrets Manager

**Database:**

- `npm run db:seed` - Seed switches and configs into MySQL database

**SAM:**

- `npm run sam:env:generate` - Generate sam-env.json from local.env
- `npm run sam:build` - Build SAM application
- `npm run sam:local` - Run SAM local API
- `npm run sam:local:watch` - Run SAM local with warm containers
- `npm run sam:invoke` - Invoke Lambda function locally

---

# API

#### Users Memberships

Path: v1/ciam/users/memberships
Method: GET
Form Data: key (small letter), value (string)
