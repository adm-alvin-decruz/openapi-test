#!/bin/bash
# Script to seed secrets into LocalStack Secrets Manager for local development
# Usage: ./scripts/seed-localstack-secrets.sh
# Make sure LocalStack is running first: npm run docker:up

set -e

# Load environment variables from local.env
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$PROJECT_DIR/local.env" ]; then
  set -a
  source "$PROJECT_DIR/local.env"
  set +a
fi

AWS_REGION="${AWS_REGION:-ap-southeast-1}"
# When running from host, use localhost instead of host.docker.internal
LOCALSTACK_ENDPOINT="${LOCALSTACK_ENDPOINT:-http://localhost:4566}"
APP_ENV="${APP_ENV:-dev}"

echo "🌱 Seeding secrets to LocalStack..."
echo "📍 Endpoint: ${LOCALSTACK_ENDPOINT}"
echo "🌍 Region: ${AWS_REGION}"
echo "🔧 Environment: ${APP_ENV}"
echo ""

# Function to create or update secret
create_or_update_secret() {
  local secret_name=$1
  local secret_value=$2
  
  echo "📦 Creating/updating '${secret_name}'..."
  AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test aws secretsmanager create-secret \
    --name "${secret_name}" \
    --secret-string "${secret_value}" \
    --endpoint-url "${LOCALSTACK_ENDPOINT}" \
    --region "${AWS_REGION}" \
    --no-cli-pager > /dev/null 2>&1 || \
  AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test aws secretsmanager put-secret-value \
    --secret-id "${secret_name}" \
    --secret-string "${secret_value}" \
    --endpoint-url "${LOCALSTACK_ENDPOINT}" \
    --region "${AWS_REGION}" \
    --no-cli-pager > /dev/null
  echo "✅ Created/updated '${secret_name}'"
}

# Secret 1: Database credentials
DB_SECRET_NAME="ciam-${APP_ENV}-db-user1"
DB_SECRET_VALUE="{\"db_user\":\"${MYSQL_USER:-ciam_user}\",\"db_password\":\"${MYSQL_PASSWORD:-ciam_password}\"}"
create_or_update_secret "${DB_SECRET_NAME}" "${DB_SECRET_VALUE}"

# Secret 2: Lambda config (SendGrid API key, Cognito client, AES secret key, etc.)
LAMBDA_SECRET_NAME="ciam-microservice-lambda-config"
LAMBDA_SECRET_VALUE='{
  "SENDGRID_API_KEY": "SG.mock_key_for_local_development_only",
  "USER_POOL_CLIENT_ID": "mock_client_id",
  "USER_POOL_CLIENT_SECRET": "mock_client_secret",
  "AES_SECRET_KEY": "mock_aes_key_32_chars_long_12345"
}'
create_or_update_secret "${LAMBDA_SECRET_NAME}" "${LAMBDA_SECRET_VALUE}"

echo ""
echo "✨ Done seeding secrets!"
echo ""
echo "📋 Listing all secrets in LocalStack:"
AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test aws secretsmanager list-secrets \
  --endpoint-url "${LOCALSTACK_ENDPOINT}" \
  --region "${AWS_REGION}" \
  --query 'SecretList[*].Name' \
  --output table 2>/dev/null || echo "⚠️  Could not list secrets (LocalStack might not be running)"

