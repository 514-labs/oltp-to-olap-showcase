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

# Create publication for CDC
echo "📡 Creating publication for CDC..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  -- Create publication if it doesn't exist
  DO \$\$
  BEGIN
      IF NOT EXISTS (
          SELECT 1 FROM pg_publication WHERE pubname = 'redpanda_cdc_publication'
      ) THEN
          CREATE PUBLICATION redpanda_cdc_publication FOR TABLE
              public.customers,
              public.products,
              public.orders,
              public.order_items;
          RAISE NOTICE 'Publication created successfully';
      ELSE
          RAISE NOTICE 'Publication already exists';
      END IF;
  END
  \$\$;

  -- Create replication slot if it doesn't exist
  SELECT pg_create_logical_replication_slot('redpanda_cdc_slot', 'pgoutput')
  WHERE NOT EXISTS (
      SELECT 1 FROM pg_replication_slots WHERE slot_name = 'redpanda_cdc_slot'
  );
EOSQL

echo "✅ PostgreSQL CDC setup complete!"
echo "  • Publication: redpanda_cdc_publication"
echo "  • Replication Slot: redpanda_cdc_slot"
echo "  • Tables: customers, products, orders, order_items"

