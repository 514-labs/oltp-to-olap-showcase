#!/bin/bash
set -e

echo "════════════════════════════════════════════════════════════"
echo "  Starting OLTP Application (SQLAlchemy + PostgreSQL)"
echo "════════════════════════════════════════════════════════════"
echo ""

# Step 1: Start PostgreSQL
echo "📦 Step 1: Starting PostgreSQL..."
docker compose -f docker-compose.oltp.yaml up -d

# Wait for PostgreSQL to be healthy
echo "⏳ Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
  if docker exec sqlmodel-postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ PostgreSQL failed to start"
    exit 1
  fi
  sleep 2
done

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ OLTP Application Started Successfully!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "PostgreSQL is running on: localhost:5434"
echo "Database: sqlmodel_db"
echo "User: postgres"
echo "Password: postgres"
echo ""
echo "Next steps:"
echo "  1. Start the FastAPI server: fastapi dev src/main.py --port 3002"
echo "  2. Start Moose: moose dev"
echo ""
