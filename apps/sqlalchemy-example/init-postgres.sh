#!/bin/bash
set -e

# This script runs when PostgreSQL first starts (before any other services)
# It creates the publication and replication slot needed for CDC

echo "🔧 Initializing PostgreSQL for CDC..."

# Wait for PostgreSQL to be fully ready
until pg_isready -U postgres; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 2
done

echo "✅ PostgreSQL is ready"

# Create replication slot for CDC
echo "📡 Creating replication slot for CDC..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  -- Create replication slot if it doesn't exist
  DO \$\$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_replication_slots WHERE slot_name = 'redpanda_cdc_slot'
    ) THEN
      PERFORM pg_create_logical_replication_slot('redpanda_cdc_slot', 'pgoutput');
      RAISE NOTICE 'Created replication slot: redpanda_cdc_slot';
    ELSE
      RAISE NOTICE 'Replication slot already exists: redpanda_cdc_slot';
    END IF;
  END
  \$\$;
EOSQL

echo "✅ CDC initialization complete"
