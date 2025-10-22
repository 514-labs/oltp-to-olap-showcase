#!/bin/bash
set -e

echo "════════════════════════════════════════════════════════════"
echo "  Moose CDC Extension Setup"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "This script sets up Change Data Capture (CDC) to stream"
echo "changes from your OLTP PostgreSQL database to Moose/ClickHouse."
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."
echo ""

# Check if REDPANDA_LICENSE is set
if [ -z "$REDPANDA_LICENSE" ]; then
  echo "❌ REDPANDA_LICENSE is not set"
  echo ""
  echo "   The PostgreSQL CDC connector requires a Redpanda Enterprise license."
  echo ""
  echo "   Set it with:"
  echo "   export REDPANDA_LICENSE=\"your_license_key\""
  echo ""
  echo "   Get a free 30-day trial: https://redpanda.com/try-enterprise"
  echo ""
  exit 1
else
  echo "✅ REDPANDA_LICENSE is set"
fi

# Check if OLTP PostgreSQL is running
if ! docker ps | grep -q "typeorm-oltp-postgres"; then
  echo "❌ OLTP PostgreSQL is not running"
  echo ""
  echo "   The OLTP application must be started before Moose CDC."
  echo ""
  echo "   Start it with:"
  echo "   ./start-oltp.sh"
  echo ""
  exit 1
else
  echo "✅ OLTP PostgreSQL is running"
fi

# Check if OLTP database has tables
if ! docker exec typeorm-oltp-postgres psql -U postgres -d typeorm_db -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='customers'" | grep -q 1; then
  echo "❌ OLTP database tables not found"
  echo ""
  echo "   Tables must exist before CDC can be set up."
  echo "   They should have been created by ./start-oltp.sh"
  echo ""
  echo "   If needed, run manually:"
  echo "   pnpm setup-db"
  echo ""
  exit 1
else
  echo "✅ OLTP database tables exist"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  All prerequisites met!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Moose will now:"
echo "  1. Start Moose infrastructure (Redpanda, ClickHouse, etc.)"
echo "  2. Create CDC publication in OLTP PostgreSQL"
echo "  3. Start Redpanda Connect to stream changes"
echo "  4. Create OLAP tables in ClickHouse"
echo ""
echo "⏳ Waiting for Moose services to start..."
echo ""

# Wait a moment for Moose base services to initialize
sleep 2

# Wait for CDC setup to complete
echo "⏳ Waiting for CDC setup..."
for i in {1..30}; do
  CDC_STATUS=$(docker inspect redpanda-pg-cdc-setup --format='{{.State.Status}}' 2>/dev/null || echo "not_started")

  if [ "$CDC_STATUS" = "exited" ]; then
    EXIT_CODE=$(docker inspect redpanda-pg-cdc-setup --format='{{.State.ExitCode}}' 2>/dev/null || echo "1")
    if [ "$EXIT_CODE" = "0" ]; then
      echo "✅ CDC publication created"
      break
    else
      echo "❌ CDC setup failed (exit code: $EXIT_CODE)"
      echo ""
      echo "   Check logs:"
      echo "   docker logs redpanda-pg-cdc-setup"
      echo ""
      exit 1
    fi
  fi

  if [ $i -eq 30 ]; then
    echo "⚠️  CDC setup still running after 30s"
    echo ""
    echo "   Check logs:"
    echo "   docker logs redpanda-pg-cdc-setup -f"
    echo ""
    break
  fi

  sleep 1
done

echo ""

# Wait for Redpanda Connect to start
echo "⏳ Waiting for Redpanda Connect..."
for i in {1..30}; do
  CONNECT_STATUS=$(docker inspect redpanda-connect --format='{{.State.Status}}' 2>/dev/null || echo "not_started")

  if [ "$CONNECT_STATUS" = "running" ]; then
    # Check health endpoint
    if curl -f -s http://localhost:4195/ready > /dev/null 2>&1; then
      echo "✅ Redpanda Connect is streaming changes"
      break
    else
      if [ $i -eq 1 ]; then
        echo "   Redpanda Connect is starting..."
      fi
    fi
  elif [ "$CONNECT_STATUS" = "exited" ]; then
    echo "❌ Redpanda Connect exited unexpectedly"
    echo ""
    echo "   Common causes:"
    echo "   • Invalid REDPANDA_LICENSE"
    echo "   • Cannot connect to PostgreSQL"
    echo "   • CDC publication doesn't exist"
    echo ""
    echo "   Check logs:"
    echo "   docker logs redpanda-connect"
    echo ""
    exit 1
  fi

  if [ $i -eq 30 ]; then
    echo "⚠️  Redpanda Connect not ready after 30s"
    echo ""
    echo "   Status: $CONNECT_STATUS"
    echo ""
    echo "   Check logs:"
    echo "   docker logs redpanda-connect"
    echo ""
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
echo "   OLTP PostgreSQL → Redpanda Connect → Redpanda → Moose Streaming Functions → ClickHouse"
echo ""
echo ""
echo "📚 Next steps:"
echo ""
echo "   1. Test CDC by creating data in OLTP:"
echo "      curl -X POST http://localhost:3000/api/customers \\"
echo "        -H \"Content-Type: application/json\" \\"
echo "        -d '{\"email\":\"test@example.com\",\"name\":\"Test User\",\"country\":\"USA\",\"city\":\"NYC\"}'"
echo ""
echo "   2. View CDC events in Redpanda:"
echo "      docker exec redpanda-1 rpk topic list"
echo "      docker exec redpanda-1 rpk topic consume typeorm.public.customers --num 1"
echo ""
echo "   3. (TODO) Create Moose streaming functions to process events → ClickHouse"
echo ""
echo "🔧 Useful commands:"
echo "   • Check CDC health:  curl http://localhost:4195/ready"
echo "   • CDC logs:          docker logs redpanda-connect -f"
echo "   • List topics:       docker exec redpanda-1 rpk topic list"
echo "   • Query ClickHouse:  docker exec clickhouse-1 clickhouse-client"
echo ""
