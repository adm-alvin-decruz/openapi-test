#!/bin/bash
# Script to run SAM commands with environment variables loaded from local.env
# Usage: ./scripts/sam-with-env.sh [sam-command] [args...]
# Example: ./scripts/sam-with-env.sh local start-api --port 3000

set -e

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load environment variables from local.env
if [ -f "$PROJECT_DIR/local.env" ]; then
  echo "📋 Loading environment variables from local.env..."
  # Export all variables from local.env (skip comments and empty lines)
  set -a
  source "$PROJECT_DIR/local.env"
  set +a
else
  echo "⚠️  Warning: local.env not found, using default values"
fi

# Change to project directory
cd "$PROJECT_DIR"

# Build SAM arguments
SAM_ARGS=("$@")

# If AWS_PROFILE is set and command needs credentials (start-api, invoke), add --profile
if [ -n "$AWS_PROFILE" ]; then
  # Commands that need AWS credentials
  if [[ "$1" == "local" && ("$2" == "start-api" || "$2" == "invoke") ]]; then
    # Check if --profile is not already in args
    if [[ ! " ${SAM_ARGS[@]} " =~ " --profile " ]]; then
      SAM_ARGS+=("--profile" "$AWS_PROFILE")
      echo "🔑 Using AWS profile: $AWS_PROFILE"
    fi
  fi
fi

# Run SAM command with all arguments
exec sam "${SAM_ARGS[@]}"

