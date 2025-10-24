# Shared CDC Infrastructure

This directory contains the **shared Change Data Capture (CDC) configuration templates** used by all microapp examples in this repository. Each app (TypeORM, SQLModel, Prisma) leverages these templates to stream PostgreSQL changes to ClickHouse through Redpanda.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [How It Works](#how-it-works)
- [Configuration Files](#configuration-files)
- [Environment Variables Reference](#environment-variables-reference)
- [App-Specific Customization](#app-specific-customization)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│  Application Layer (TypeORM/SQLModel/Prisma)                         │
│  - Creates/updates OLTP data in PostgreSQL                           │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ SQL INSERT/UPDATE/DELETE
                         ↓
┌──────────────────────────────────────────────────────────────────────┐
│  PostgreSQL (OLTP Database)                                          │
│  - Logical replication enabled (wal_level=logical)                   │
│  - Write-Ahead Log (WAL) captures every change                       │
│  - Publications define which tables to replicate                     │
│  - Replication slots track consumption position                      │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ WAL Stream
                         ↓
┌──────────────────────────────────────────────────────────────────────┐
│  init-postgres-cdc.sh (Initialization Script)                        │
│  - Waits for PostgreSQL to be ready                                  │
│  - Waits for app tables to be created                                │
│  - Creates publication: POSTGRES_CDC_PUBLICATION                     │
│  - Creates replication slot: POSTGRES_CDC_SLOT                       │
│  - Runs once per app startup                                         │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ Setup complete
                         ↓
┌──────────────────────────────────────────────────────────────────────┐
│  Redpanda Connect (CDC Connector)                                    │
│  - Reads from PostgreSQL replication slot                            │
│  - Decodes WAL using pgoutput plugin                                 │
│  - Transforms to JSON events with metadata                           │
│  - Publishes to Kafka topic                                          │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ Kafka/Redpanda Topic
                         ↓
┌──────────────────────────────────────────────────────────────────────┐
│  Redpanda (Kafka-compatible Message Broker)                          │
│  - Buffers CDC events                                                │
│  - Provides durability and ordering guarantees                       │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ Consume events
                         ↓
┌──────────────────────────────────────────────────────────────────────┐
│  Moose (Stream Processing Framework)                                 │
│  - Consumes from Kafka topic                                         │
│  - Applies transformation functions                                  │
│  - Denormalizes data (joins across tables)                           │
│  - Handles schema evolution                                          │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ Transformed analytics events
                         ↓
┌──────────────────────────────────────────────────────────────────────┐
│  ClickHouse (OLAP Database)                                          │
│  - Stores denormalized fact and dimension tables                     │
│  - Optimized for fast analytical queries                             │
│  - Columnar storage with compression                                 │
└──────────────────────────────────────────────────────────────────────┘
```

### Data Flow Example

**Step 1: Application creates an order**
```typescript
// TypeORM example
await orderRepo.save({ customerId: 123, total: 99.99, status: 'pending' });
```

**Step 2: PostgreSQL WAL captures the change**
```
WAL Record:
  LSN: 0/1A2B3C4
  Operation: INSERT
  Table: orders
  Data: { id: 1, customer_id: 123, total: 99.99, status: 'pending' }
```

**Step 3: Redpanda Connect streams to Kafka**
```json
{
  "_metadata": {
    "table": "orders",
    "operation": "insert",
    "lsn": "0/1A2B3C4"
  },
  "payload": {
    "id": 1,
    "customer_id": 123,
    "total": 99.99,
    "status": "pending"
  }
}
```

**Step 4: Moose transforms and denormalizes**
```typescript
// Joins with customer data
{
  order_id: 1,
  customer_id: 123,
  customer_name: "John Doe",      // Denormalized from customers table
  customer_email: "john@example.com",
  total: 99.99,
  status: "pending"
}
```

**Step 5: Data lands in ClickHouse**
```sql
SELECT * FROM order_fact WHERE order_id = 1;
-- Returns denormalized row ready for analytics
```

## How It Works

### 1. Template-Based Configuration

The CDC infrastructure uses **environment variable substitution** to customize shared templates for each app:

- **docker-compose.postgres.yaml** - Base PostgreSQL service with logical replication enabled
- **init-postgres-cdc.sh** - Shell script that creates publications and replication slots
- **redpanda-connect.template.yaml** - CDC connector configuration

Each app provides a `docker-compose.dev.override.yaml` that:
1. Extends the base PostgreSQL configuration
2. Adds app-specific environment variables
3. Configures the CDC setup and connector services

### 2. Startup Sequence

```
1. PostgreSQL starts (from docker-compose.postgres.yaml)
   └─> wal_level=logical enabled
   └─> max_replication_slots configured

2. Application creates database tables
   └─> TypeORM: synchronize or migrations
   └─> SQLModel: SQLModel.metadata.create_all()
   └─> Prisma: prisma db push or migrate

3. CDC setup container runs (cdc-setup service)
   └─> Waits for PostgreSQL
   └─> Waits for specific table (POSTGRES_CDC_WAIT_FOR_TABLE)
   └─> Creates publication (POSTGRES_CDC_PUBLICATION)
   └─> Creates replication slot (POSTGRES_CDC_SLOT)
   └─> Exits with success

4. Redpanda Connect starts (redpanda-connect service)
   └─> Connects to PostgreSQL replication slot
   └─> Begins streaming changes to Kafka topic
   └─> Exposes health check on port 4195

5. Moose consumes and transforms
   └─> Reads from Kafka topic
   └─> Applies streaming functions
   └─> Writes to ClickHouse
```

### 3. Publication and Replication Slots

**Publications** define which tables PostgreSQL should replicate:

```sql
-- All tables
CREATE PUBLICATION redpanda_cdc_publication FOR ALL TABLES;

-- Specific tables only
CREATE PUBLICATION redpanda_cdc_publication
FOR TABLE customers, products, orders, order_items;
```

**Replication Slots** track the consumer's position in the WAL:

```sql
-- Create a logical replication slot using pgoutput plugin
SELECT pg_create_logical_replication_slot('redpanda_cdc_slot', 'pgoutput');

-- Check slot status
SELECT * FROM pg_replication_slots WHERE slot_name = 'redpanda_cdc_slot';
```

## Configuration Files

### docker-compose.postgres.yaml

Base PostgreSQL service configuration used by all apps.

**Key settings:**

```yaml
services:
  postgres:
    image: postgres:15-alpine
    command:
      - postgres
      - -c
      - wal_level=logical              # Enable logical replication
      - -c
      - max_replication_slots=10       # Allow up to 10 slots
      - -c
      - max_wal_senders=10             # Allow up to 10 WAL senders
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: ${POSTGRES_DB:-app_db}
```

Apps override these variables in their `docker-compose.oltp.yaml` files to set:
- Container name
- Port mapping
- Network configuration
- Database name

### init-postgres-cdc.sh

Shell script that initializes CDC primitives in PostgreSQL.

**Features:**

- Waits for PostgreSQL to accept connections (60 attempts × 2s)
- Optionally waits for a specific table to exist (controlled by `POSTGRES_CDC_WAIT_FOR_TABLE`)
- Creates publication for specified tables or all tables
- Creates replication slot using pgoutput plugin
- Idempotent: safe to run multiple times (checks if publication/slot exist)

**Environment variables used:**

| Variable | Default | Description |
|----------|---------|-------------|
| `PGHOST` | `localhost` | PostgreSQL hostname |
| `PGPORT` | `5432` | PostgreSQL port |
| `PGUSER` | `postgres` | Database user |
| `PGPASSWORD` | (empty) | Database password |
| `PGDATABASE` | `postgres` | Database name |
| `POSTGRES_CDC_PUBLICATION` | `redpanda_cdc_publication` | Publication name |
| `POSTGRES_CDC_SLOT` | `redpanda_cdc_slot` | Replication slot name |
| `POSTGRES_CDC_SCHEMA` | `public` | Schema containing tables |
| `POSTGRES_CDC_TABLES` | (empty) | Comma-separated table list or `*` for all |
| `POSTGRES_CDC_WAIT_FOR_TABLE` | (empty) | Wait for this table before proceeding |

**Example output:**

```
🔍 Waiting for PostgreSQL (typeorm-oltp-postgres:5432) to accept connections...
✅ PostgreSQL is accepting connections
⏳ Waiting for table public.customers to exist...
✅ Found table public.customers
📡 Ensuring publication "redpanda_cdc_publication" and slot "redpanda_cdc_slot" exist...
✅ CDC primitives ready.
   • Publication: redpanda_cdc_publication (tables: public.customers, public.products, public.orders, public.order_items)
   • Replication slot: redpanda_cdc_slot
```

### redpanda-connect.template.yaml

Redpanda Connect configuration for consuming PostgreSQL CDC events.

**Structure:**

```yaml
input:
  postgres_cdc:
    dsn: ${POSTGRES_CDC_DSN}
    schema: ${POSTGRES_CDC_SCHEMA:public}
    slot_name: ${POSTGRES_CDC_SLOT:redpanda_cdc_slot}
    publication_name: ${POSTGRES_CDC_PUBLICATION:redpanda_cdc_publication}
    tables: ${POSTGRES_CDC_TABLES_JSON:["customers","products","orders","order_items"]}

pipeline:
  processors:
    - mapping: |
        # Add metadata to each event
        root = this
        root._metadata = {
          "table": meta("table"),
          "operation": meta("operation"),
          "lsn": meta("lsn")
        }
        root.payload = this

output:
  kafka:
    addresses:
      - ${POSTGRES_CDC_BROKER_ADDRESS:redpanda:9092}
    topic: ${POSTGRES_CDC_TOPIC:cdc_events}
    max_in_flight: 1              # Ensures ordering

http:
  address: ${POSTGRES_CDC_HTTP_ADDR:0.0.0.0:4195}
```

**Key features:**

- **postgres_cdc input**: Connects to PostgreSQL replication slot
- **mapping processor**: Enriches events with metadata (table, operation, LSN)
- **kafka output**: Publishes to Redpanda/Kafka topic with ordering guarantees
- **http server**: Health check and metrics endpoint

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_CDC_DSN` | PostgreSQL connection string for CDC | `postgres://user:pass@host:5432/db?sslmode=disable` |
| `REDPANDA_LICENSE` | Redpanda Enterprise license key | `eyJhbGc...` |

### Connection Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `postgres` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `postgres` | PostgreSQL password |
| `POSTGRES_DB` | `app_db` | Database name |
| `PGHOST` | `localhost` | PostgreSQL host for init script |
| `PGPORT` | `5432` | PostgreSQL port for init script |

### CDC Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_CDC_SCHEMA` | `public` | Database schema to replicate |
| `POSTGRES_CDC_PUBLICATION` | `redpanda_cdc_publication` | Publication name |
| `POSTGRES_CDC_SLOT` | `redpanda_cdc_slot` | Replication slot name |
| `POSTGRES_CDC_TABLES` | (empty) | Comma-separated list for init script (e.g., `customers,orders`) |
| `POSTGRES_CDC_TABLES_JSON` | `["customers","products","orders","order_items"]` | JSON array for Redpanda Connect |
| `POSTGRES_CDC_WAIT_FOR_TABLE` | (empty) | Wait for this table before creating publication |

### Streaming Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_CDC_TOPIC` | `cdc_events` | Kafka topic for CDC events |
| `POSTGRES_CDC_BROKER_ADDRESS` | `redpanda:9092` | Kafka broker address |
| `POSTGRES_CDC_HTTP_ADDR` | `0.0.0.0:4195` | HTTP health check address |
| `POSTGRES_CDC_HTTP_PORT` | `4195` | Host port for health check (mapped to container) |

### Container Names

| Variable | Default | Description |
|----------|---------|-------------|
| `OLTP_POSTGRES_CONTAINER` | (app-specific) | PostgreSQL container name |
| `CDC_SETUP_CONTAINER_NAME` | (app-specific) | CDC setup container name |
| `CDC_CONNECT_CONTAINER_NAME` | (app-specific) | Redpanda Connect container name |

### Network Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OLTP_POSTGRES_NETWORK` | (app-specific) | Docker network for OLTP services |
| `OLTP_POSTGRES_PORT` | (app-specific) | Host port for PostgreSQL |

## App-Specific Customization

Each app customizes the shared templates through environment variables in their `docker-compose.dev.override.yaml` file.

### TypeORM Example

**Network:** `oltp-network`
**PostgreSQL Port:** `5433`
**CDC Topic:** `typeorm_cdc_events`
**Tables:** `customers, products, orders, order_items` (plural)

```yaml
# apps/typeorm-example/docker-compose.dev.override.yaml
services:
  cdc-setup:
    environment:
      PGHOST: typeorm-oltp-postgres
      PGDATABASE: typeorm_db
      POSTGRES_CDC_TABLES: customers,products,orders,order_items
      POSTGRES_CDC_WAIT_FOR_TABLE: customers

  redpanda-connect:
    environment:
      POSTGRES_CDC_DSN: postgres://postgres:postgres@typeorm-oltp-postgres:5432/typeorm_db?sslmode=disable
      POSTGRES_CDC_TABLES_JSON: ["customers","products","orders","order_items"]
      POSTGRES_CDC_TOPIC: typeorm_cdc_events
      POSTGRES_CDC_HTTP_PORT: 4195
```

### SQLModel Example

**Network:** `sqlmodel-network`
**PostgreSQL Port:** `5434`
**CDC Topic:** `sqlmodel_cdc_events`
**Tables:** `customer, product, order, orderitem` (singular)

```yaml
# apps/sqlmodel-example/docker-compose.dev.override.yaml
services:
  cdc-setup:
    environment:
      PGHOST: sqlmodel-postgres
      PGDATABASE: sqlmodel_db
      POSTGRES_CDC_TABLES: customer,product,order,orderitem
      POSTGRES_CDC_WAIT_FOR_TABLE: customer

  redpanda-connect:
    environment:
      POSTGRES_CDC_DSN: postgresql://postgres:postgres@sqlmodel-postgres:5432/sqlmodel_db?sslmode=disable
      POSTGRES_CDC_TABLES_JSON: ["customer","product","order","orderitem"]
      POSTGRES_CDC_TOPIC: sqlmodel_cdc_events
      POSTGRES_CDC_HTTP_PORT: 4196
```

### Prisma Example (WIP)

**Network:** `prisma-network`
**PostgreSQL Port:** `5435`
**CDC Topic:** `prisma_cdc_events`
**Tables:** TBD (depends on Prisma schema)

## Troubleshooting

### CDC Setup Container Fails

**Symptom:** `cdc-setup` container exits with error

**Check logs:**
```bash
docker logs typeorm-cdc-setup
# or
docker logs sqlmodel-cdc-setup
```

**Common causes:**

1. **PostgreSQL not ready**
   ```
   ❌ PostgreSQL is still unavailable after 60 attempts
   ```
   Solution: Check PostgreSQL container is running and healthy
   ```bash
   docker ps | grep postgres
   docker logs typeorm-oltp-postgres
   ```

2. **Table not found**
   ```
   ❌ Table public.customers not found after 60 attempts
   ```
   Solution: Ensure application has created tables before CDC setup runs
   ```bash
   # TypeORM: run pnpm setup-db or pnpm dev
   # SQLModel: run python init_db.py
   ```

3. **Wrong database credentials**
   ```
   psql: error: connection to server failed
   ```
   Solution: Verify environment variables match in all services
   ```bash
   echo $POSTGRES_USER
   echo $POSTGRES_PASSWORD
   echo $POSTGRES_DB
   ```

### Redpanda Connect Won't Start

**Symptom:** `redpanda-connect` container keeps restarting

**Check logs:**
```bash
docker logs typeorm-redpanda-connect
# or
docker logs sqlmodel-redpanda-connect
```

**Common causes:**

1. **Missing Redpanda license**
   ```
   error: REDPANDA_LICENSE environment variable is required
   ```
   Solution: Set license in environment
   ```bash
   export REDPANDA_LICENSE="your_license_key_here"
   ```

2. **Invalid DSN format**
   ```
   error: failed to connect to PostgreSQL
   ```
   Solution: Ensure DSN includes `?sslmode=disable` for Docker networks
   ```
   postgres://user:pass@host:5432/db?sslmode=disable
   ```

3. **Publication or slot doesn't exist**
   ```
   error: publication "redpanda_cdc_publication" does not exist
   ```
   Solution: Ensure `cdc-setup` completed successfully before Connect starts

4. **Wrong table names**
   ```
   error: table "customers" not found in publication
   ```
   Solution: Verify `POSTGRES_CDC_TABLES_JSON` matches actual table names

### No Data Flowing to ClickHouse

**Diagnostic steps:**

**Step 1: Verify data exists in PostgreSQL**
```bash
# Connect to PostgreSQL
docker exec -it typeorm-oltp-postgres psql -U postgres -d typeorm_db

# Check data
SELECT * FROM customers LIMIT 5;
```

**Step 2: Check publication and slot**
```sql
-- List publications
SELECT * FROM pg_publication;

-- List replication slots
SELECT * FROM pg_replication_slots;

-- Check slot activity
SELECT * FROM pg_stat_replication_slots;
```

**Step 3: Verify Redpanda Connect is consuming**
```bash
# Health check
curl http://localhost:4195/ready

# Should return: {"status": "ok"}
```

**Step 4: Check Redpanda topic**
```bash
# List topics
docker exec -it redpanda-0 rpk topic list

# Consume from topic
docker exec -it redpanda-0 rpk topic consume typeorm_cdc_events --num 10
```

**Step 5: Check Moose processing**
```bash
# View Moose logs
# (Moose should show events being processed)

# Check Moose console
open http://localhost:5001
```

**Step 6: Query ClickHouse**
```bash
docker exec -it moose-clickhouse clickhouse-client -u panda --password pandapass

# Check if tables exist
SHOW TABLES FROM local;

# Check if data exists
SELECT * FROM local.customer_dim LIMIT 5;
```

### Replication Slot Lag

**Symptom:** Replication slot consuming old data or lagging behind

**Check slot status:**
```sql
SELECT
  slot_name,
  database,
  active,
  pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS lag_bytes
FROM pg_replication_slots
WHERE slot_name = 'redpanda_cdc_slot';
```

**Solutions:**

1. **Restart Redpanda Connect** if it's stuck
   ```bash
   docker restart typeorm-redpanda-connect
   ```

2. **Drop and recreate slot** if hopelessly behind (WARNING: loses position)
   ```sql
   SELECT pg_drop_replication_slot('redpanda_cdc_slot');
   -- Restart cdc-setup container to recreate
   ```

### Reset CDC Pipeline

**Complete reset (WARNING: destroys all CDC state):**

```bash
# Stop all services
docker compose -f docker-compose.postgres.yaml -f docker-compose.oltp.yaml -f docker-compose.dev.override.yaml down

# Connect to PostgreSQL
docker exec -it typeorm-oltp-postgres psql -U postgres -d typeorm_db

# Drop publication and slot
DROP PUBLICATION IF EXISTS redpanda_cdc_publication;
SELECT pg_drop_replication_slot('redpanda_cdc_slot');

# Restart services
./start-oltp.sh
moose dev
```

### Debugging Tips

**Enable verbose logging:**
```yaml
# In docker-compose.dev.override.yaml
redpanda-connect:
  environment:
    LOG_LEVEL: debug
```

**Monitor PostgreSQL WAL:**
```sql
-- Check WAL generation
SELECT pg_current_wal_lsn();

-- Check WAL size
SELECT pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn))
FROM pg_replication_slots
WHERE slot_name = 'redpanda_cdc_slot';
```

**Check Docker networks:**
```bash
docker network ls
docker network inspect oltp-network
```

**Verify service connectivity:**
```bash
# From CDC container to PostgreSQL
docker exec typeorm-cdc-setup pg_isready -h typeorm-oltp-postgres -p 5432

# From Redpanda Connect to PostgreSQL
docker exec typeorm-redpanda-connect nc -zv typeorm-oltp-postgres 5432
```

## Best Practices

### Table Naming

- **Be consistent**: Use either singular (`customer`) or plural (`customers`) throughout
- **Match CDC config**: Ensure `POSTGRES_CDC_TABLES` and `POSTGRES_CDC_TABLES_JSON` match actual table names
- **Avoid underscores in compound names**: Use `orderitem` or `OrderItem`, not `order_items`

### Resource Management

- **Limit replication slots**: Don't create more slots than needed (default max: 10)
- **Monitor WAL retention**: Inactive slots can cause WAL accumulation
- **Set appropriate timeouts**: Increase if initialization takes longer than expected

### Security

- **Use SSL in production**: The `?sslmode=disable` is for development only
- **Rotate credentials**: Don't use default passwords in production
- **Restrict publication**: Only replicate tables that need CDC (don't use `FOR ALL TABLES`)

### Performance

- **Use specific tables**: Avoid `FOR ALL TABLES` if you only need subset
- **Monitor lag**: Check replication slot lag regularly
- **Batch inserts**: Reduce WAL overhead with larger transactions

## Additional Resources

- [PostgreSQL Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)
- [Redpanda Connect PostgreSQL CDC](https://docs.redpanda.com/redpanda-connect/components/inputs/postgres_cdc/)
- [Moose Documentation](https://docs.fiveonefour.com/moose/)
- [ClickHouse Documentation](https://clickhouse.com/docs/)

## Support

For issues specific to:
- **TypeORM implementation**: See [apps/typeorm-example/README.md](../../../apps/typeorm-example/README.md)
- **SQLModel implementation**: See [apps/sqlmodel-example/README.md](../../../apps/sqlmodel-example/README.md)
- **Prisma implementation**: See [apps/prisma-example/README.md](../../../apps/prisma-example/README.md)
- **Repository-wide issues**: See main [README.md](../../../README.md)
