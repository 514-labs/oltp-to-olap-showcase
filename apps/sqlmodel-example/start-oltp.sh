#!/bin/bash
set -euo pipefail

BASE_DIR=$(cd "$(dirname "$0")" && pwd)
SHARED_COMPOSE="$BASE_DIR/../../packages/shared/cdc/docker-compose.postgres.yaml"
APP_COMPOSE="$BASE_DIR/docker-compose.oltp.yaml"
ENV_FILE="$BASE_DIR/.env"

# Load .env file if it exists
if [ -f "$ENV_FILE" ]; then
  echo "📝 Loading environment variables from .env..."
  set -a  # automatically export all variables
  source "$ENV_FILE"
  set +a
else
  echo "⚠️  No .env file found at $ENV_FILE"
  echo "   Using default values. To customize, create .env from env.example"
fi

OLTP_CONTAINER="${OLTP_POSTGRES_CONTAINER:-sqlmodel-postgres}"
OLTP_PORT="${OLTP_POSTGRES_PORT:-5434}"
OLTP_DB="${OLTP_POSTGRES_DB:-sqlmodel_db}"

if [ ! -f "$SHARED_COMPOSE" ]; then
  echo "❌ Cannot find shared PostgreSQL compose file at $SHARED_COMPOSE" >&2
  exit 1
fi

echo "════════════════════════════════════════════════════════════"
echo "  Starting OLTP Application (SQLModel + PostgreSQL)"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "🔧 Configuration:"
echo "   • Container: $OLTP_CONTAINER"
echo "   • Port: $OLTP_PORT"
echo "   • Database: $OLTP_DB"
echo ""

echo "📦 Step 1: Starting PostgreSQL..."
docker compose -f "$SHARED_COMPOSE" -f "$APP_COMPOSE" --env-file "$ENV_FILE" up -d

echo "⏳ Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
  if docker exec "$OLTP_CONTAINER" pg_isready -U "${POSTGRES_USER:-postgres}" > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ PostgreSQL failed to start"
    echo "   Check logs: docker logs $OLTP_CONTAINER"
    exit 1
  fi
  sleep 2
done

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ OLTP Application Started Successfully!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "PostgreSQL container: $OLTP_CONTAINER"
echo "Host port: $OLTP_PORT"
echo "Database: $OLTP_DB"
echo "User: ${POSTGRES_USER:-postgres}"
echo "Password: ${POSTGRES_PASSWORD:-postgres}"
echo ""
echo "Next steps:"
echo "  1. Start the FastAPI server: fastapi dev src/main.py --port 3002"
echo "  2. Start Moose: moose dev"
echo ""
