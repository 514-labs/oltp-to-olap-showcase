#!/bin/sh
set -eu

# Derive connection defaults
PGUSER="${PGUSER:-${POSTGRES_USER:-postgres}}"
PGDATABASE="${PGDATABASE:-${POSTGRES_DB:-postgres}}"
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGPASSWORD="${PGPASSWORD:-${POSTGRES_PASSWORD:-}}"

export PGUSER PGDATABASE PGHOST PGPORT PGPASSWORD

printf '🔍 Waiting for PostgreSQL (%s:%s) to accept connections...\n' "$PGHOST" "$PGPORT"

ATTEMPT=0
until pg_isready >/dev/null 2>&1; do
  ATTEMPT=$((ATTEMPT + 1))
  if [ "$ATTEMPT" -ge 60 ]; then
    printf '❌ PostgreSQL is still unavailable after %s attempts\n' "$ATTEMPT"
    exit 1
  fi
  sleep 2
  printf '  • Attempt %s: still waiting...\n' "$ATTEMPT"
done

printf '✅ PostgreSQL is accepting connections\n'

WAIT_FOR_TABLE="${POSTGRES_CDC_WAIT_FOR_TABLE:-}"
SCHEMA="${POSTGRES_CDC_SCHEMA:-public}"

if [ -n "$WAIT_FOR_TABLE" ]; then
  printf '⏳ Waiting for table %s.%s to exist...\n' "$SCHEMA" "$WAIT_FOR_TABLE"
  ATTEMPT=0
  until psql -Atqc "SELECT 1 FROM information_schema.tables WHERE table_schema = '$SCHEMA' AND table_name = '$WAIT_FOR_TABLE'" | grep -q 1; do
    ATTEMPT=$((ATTEMPT + 1))
    if [ "$ATTEMPT" -ge 60 ]; then
      printf '❌ Table %s.%s not found after %s attempts\n' "$SCHEMA" "$WAIT_FOR_TABLE" "$ATTEMPT"
      exit 1
    fi
    sleep 2
    printf '  • Attempt %s: table missing, retrying...\n' "$ATTEMPT"
  done
  printf '✅ Found table %s.%s\n' "$SCHEMA" "$WAIT_FOR_TABLE"
fi

PUBLICATION="${POSTGRES_CDC_PUBLICATION:-redpanda_cdc_publication}"
SLOT="${POSTGRES_CDC_SLOT:-redpanda_cdc_slot}"
TABLES_RAW="${POSTGRES_CDC_TABLES:-}"

TABLES_MODE="list"
TABLES_SQL=""
if [ -z "$TABLES_RAW" ] || [ "$TABLES_RAW" = "*" ]; then
  TABLES_MODE="all"
else
  OLDIFS=$IFS
  IFS=','
  for TABLE in $TABLES_RAW; do
    TABLE_TRIMMED=$(printf '%s' "$TABLE" | xargs)
    [ -z "$TABLE_TRIMMED" ] && continue
    if [ -n "$TABLES_SQL" ]; then
      TABLES_SQL="$TABLES_SQL, "
    fi
    TABLES_SQL="${TABLES_SQL}${SCHEMA}.${TABLE_TRIMMED}"
  done
  IFS=$OLDIFS
  if [ -z "$TABLES_SQL" ]; then
    TABLES_MODE="all"
  fi
fi

SQL_FILE=$(mktemp)
trap 'rm -f "$SQL_FILE"' EXIT

if [ "$TABLES_MODE" = "all" ]; then
  cat >"$SQL_FILE" <<EOSQL
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = '${PUBLICATION}') THEN
    CREATE PUBLICATION ${PUBLICATION} FOR ALL TABLES;
  ELSE
    RAISE NOTICE 'Publication already exists';
  END IF;
END
$$;

SELECT 1 FROM pg_replication_slots WHERE slot_name = '${SLOT}' INTO TEMP TABLE existing_slot;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM existing_slot) THEN
    PERFORM pg_create_logical_replication_slot('${SLOT}', 'pgoutput');
  ELSE
    RAISE NOTICE 'Replication slot already exists';
  END IF;
END
$$;
EOSQL
else
  cat >"$SQL_FILE" <<EOSQL
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = '${PUBLICATION}') THEN
    CREATE PUBLICATION ${PUBLICATION} FOR TABLE ${TABLES_SQL};
  ELSE
    RAISE NOTICE 'Publication already exists';
  END IF;
END
$$;

SELECT 1 FROM pg_replication_slots WHERE slot_name = '${SLOT}' INTO TEMP TABLE existing_slot;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM existing_slot) THEN
    PERFORM pg_create_logical_replication_slot('${SLOT}', 'pgoutput');
  ELSE
    RAISE NOTICE 'Replication slot already exists';
  END IF;
END
$$;
EOSQL
fi

printf '📡 Ensuring publication "%s" and slot "%s" exist...\n' "$PUBLICATION" "$SLOT"
psql -v ON_ERROR_STOP=1 -f "$SQL_FILE"

printf '✅ CDC primitives ready.\n'
if [ "$TABLES_MODE" = "all" ]; then
  printf '   • Publication: %s (all tables)\n' "$PUBLICATION"
else
  printf '   • Publication: %s (tables: %s)\n' "$PUBLICATION" "$TABLES_SQL"
fi
printf '   • Replication slot: %s\n' "$SLOT"
