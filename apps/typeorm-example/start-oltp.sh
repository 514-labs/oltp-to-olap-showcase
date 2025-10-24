#!/bin/bash
set -euo pipefail

BASE_DIR=$(cd "$(dirname "$0")" && pwd)
SHARED_COMPOSE="$BASE_DIR/../../packages/shared/cdc/docker-compose.postgres.yaml"
APP_COMPOSE="$BASE_DIR/docker-compose.oltp.yaml"

OLTP_CONTAINER="${OLTP_POSTGRES_CONTAINER:-typeorm-oltp-postgres}"
OLTP_PORT="${OLTP_POSTGRES_PORT:-5433}"
OLTP_DB="${OLTP_POSTGRES_DB:-typeorm_db}"

if [ ! -f "$SHARED_COMPOSE" ]; then
  echo "❌ Cannot find shared PostgreSQL compose file at $SHARED_COMPOSE" >&2
  exit 1
fi

echo "════════════════════════════════════════════════════════════"
echo "  Starting OLTP Application (TypeORM + PostgreSQL)"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "📦 Step 1: Starting PostgreSQL..."
docker compose -f "$SHARED_COMPOSE" -f "$APP_COMPOSE" up -d

echo "⏳ Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
  if docker exec "$OLTP_CONTAINER" pg_isready -U "${POSTGRES_USER:-postgres}" > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
    break
  fi

  if [ $i -eq 30 ]; then
    echo "❌ PostgreSQL failed to start after 30s"
    echo "   Check logs: docker logs $OLTP_CONTAINER"
    exit 1
  fi

  sleep 1
done

echo ""
echo "📋 Step 2: Creating database tables..."
if pnpm setup-db; then
  echo "✅ Database tables created"
else
  echo "❌ Failed to create database tables"
  echo "   Check the error above"
  exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ OLTP Application Ready"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📊 Status:"
echo "   • PostgreSQL container: $OLTP_CONTAINER"
echo "   • Host port: $OLTP_PORT"
echo "   • Database: $OLTP_DB"
echo ""
echo "🚀 Next steps:"
echo ""
echo "   1. Start the API server:"
echo "      pnpm dev"
echo ""
echo "   2. (Optional) Add CDC/OLAP layer:"
echo "      moose dev"
echo ""
echo "📚 Useful commands:"
echo "   • Connect to database: docker exec -it $OLTP_CONTAINER psql -U ${POSTGRES_USER:-postgres} -d $OLTP_DB"
echo "   • View tables: docker exec $OLTP_CONTAINER psql -U ${POSTGRES_USER:-postgres} -d $OLTP_DB -c '\dt'"
echo "   • Stop OLTP: docker compose -f \"$SHARED_COMPOSE\" -f \"$APP_COMPOSE\" down"
echo ""
