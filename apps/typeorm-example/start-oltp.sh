#!/bin/bash
set -e

echo "════════════════════════════════════════════════════════════"
echo "  Starting OLTP Application (TypeORM + PostgreSQL)"
echo "════════════════════════════════════════════════════════════"
echo ""

# Step 1: Start PostgreSQL
echo "📦 Step 1: Starting PostgreSQL..."
docker compose -f docker-compose.oltp.yaml up -d

# Wait for PostgreSQL to be healthy
echo "⏳ Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
  if docker exec typeorm-oltp-postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
    break
  fi

  if [ $i -eq 30 ]; then
    echo "❌ PostgreSQL failed to start after 30s"
    echo "   Check logs: docker logs typeorm-oltp-postgres"
    exit 1
  fi

  sleep 1
done

echo ""

# Step 2: Create database tables
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
echo "   • PostgreSQL: Running on localhost:5433"
echo "   • Database: typeorm_db"
echo "   • Tables: customers, products, orders, order_items"
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
echo "   • Connect to database: docker exec -it typeorm-oltp-postgres psql -U postgres -d typeorm_db"
echo "   • View tables: docker exec typeorm-oltp-postgres psql -U postgres -d typeorm_db -c '\dt'"
echo "   • Stop OLTP: docker compose -f docker-compose.oltp.yaml down"
echo ""
