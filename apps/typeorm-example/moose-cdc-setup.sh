#!/bin/bash
set -euo pipefail

OLTP_CONTAINER="${OLTP_POSTGRES_CONTAINER:-typeorm-oltp-postgres}"
OLTP_DB="${OLTP_POSTGRES_DB:-typeorm_db}"
CDC_SETUP_CONTAINER="${CDC_SETUP_CONTAINER_NAME:-typeorm-cdc-setup}"
CDC_CONNECT_CONTAINER="${CDC_CONNECT_CONTAINER_NAME:-typeorm-redpanda-connect}"
TABLE_CHECK="${POSTGRES_CDC_WAIT_FOR_TABLE:-customers}"

echo "════════════════════════════════════════════════════════════"
echo "  Moose CDC Extension Setup"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "🔍 Checking prerequisites..."
echo ""

if [ -z "${REDPANDA_LICENSE:-}" ]; then
  cat <<MSG
❌ REDPANDA_LICENSE is not set

   The PostgreSQL CDC connector requires a Redpanda Enterprise license.
   Set it with:
     export REDPANDA_LICENSE="your_license_key"

   Get a free 30-day trial: https://redpanda.com/try-enterprise
MSG
  exit 1
else
  echo "✅ REDPANDA_LICENSE is set"
fi

if ! docker ps | grep -q "$OLTP_CONTAINER"; then
  cat <<MSG
❌ OLTP PostgreSQL is not running

   Start it with:
     ./start-oltp.sh
MSG
  exit 1
else
  echo "✅ OLTP PostgreSQL is running (container: $OLTP_CONTAINER)"
fi

if [ -n "$TABLE_CHECK" ]; then
  SCHEMA="${POSTGRES_CDC_SCHEMA:-public}"
  if ! docker exec "$OLTP_CONTAINER" psql -U "${POSTGRES_USER:-postgres}" -d "$OLTP_DB" -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema='${SCHEMA}' AND table_name='${TABLE_CHECK}'" | grep -q 1; then
    cat <<MSG
❌ OLTP database tables not found

   Tables must exist before CDC can be set up. They should be created by ./start-oltp.sh.
   You can create them manually with:
     pnpm setup-db
MSG
    exit 1
  else
    echo "✅ OLTP database tables exist"
  fi
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  All prerequisites met!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Moose will now provision CDC infrastructure and ClickHouse tables."
echo "⏳ Waiting for CDC setup container ($CDC_SETUP_CONTAINER)..."

for i in {1..30}; do
  STATUS=$(docker inspect "$CDC_SETUP_CONTAINER" --format='{{.State.Status}}' 2>/dev/null || echo "not_started")
  if [ "$STATUS" = "exited" ]; then
    EXIT_CODE=$(docker inspect "$CDC_SETUP_CONTAINER" --format='{{.State.ExitCode}}' 2>/dev/null || echo "1")
    if [ "$EXIT_CODE" = "0" ]; then
      echo "✅ CDC publication created"
      break
    fi
    echo "❌ CDC setup failed (exit code: $EXIT_CODE)"
    echo "   Check logs: docker logs $CDC_SETUP_CONTAINER"
    exit 1
  fi

  if [ $i -eq 30 ]; then
    echo "⚠️  CDC setup still running after 30s"
    echo "   Check logs: docker logs $CDC_SETUP_CONTAINER -f"
    break
  fi
  sleep 1
done

echo ""
echo "⏳ Waiting for Redpanda Connect ($CDC_CONNECT_CONTAINER)..."
for i in {1..30}; do
  STATUS=$(docker inspect "$CDC_CONNECT_CONTAINER" --format='{{.State.Status}}' 2>/dev/null || echo "not_started")
  if [ "$STATUS" = "running" ]; then
    if curl -f -s "${POSTGRES_CDC_HEALTH_ENDPOINT:-http://localhost:${POSTGRES_CDC_HTTP_PORT:-4195}/ready}" >/dev/null 2>&1; then
      echo "✅ Redpanda Connect is streaming changes"
      break
    elif [ $i -eq 1 ]; then
      echo "   Redpanda Connect is starting..."
    fi
  elif [ "$STATUS" = "exited" ]; then
    echo "❌ Redpanda Connect exited unexpectedly"
    echo "   Check logs: docker logs $CDC_CONNECT_CONTAINER"
    exit 1
  fi

  if [ $i -eq 30 ]; then
    echo "⚠️  Redpanda Connect not ready after 30s"
    echo "   Status: $STATUS"
    echo "   Logs: docker logs $CDC_CONNECT_CONTAINER"
    break
  fi
  sleep 1
done

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ Moose CDC Extension Ready!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📊 CDC Pipeline:"
echo "   $OLTP_CONTAINER → Redpanda Connect → Redpanda → Moose → ClickHouse"
echo ""
echo "🔧 Useful commands:"
echo "   • CDC health: curl ${POSTGRES_CDC_HEALTH_ENDPOINT:-http://localhost:${POSTGRES_CDC_HTTP_PORT:-4195}/ready}"
echo "   • CDC logs:  docker logs $CDC_CONNECT_CONTAINER -f"
echo "   • Topics:    docker exec redpanda-1 rpk topic list"
echo "   • ClickHouse: docker exec clickhouse-1 clickhouse-client"
echo ""
