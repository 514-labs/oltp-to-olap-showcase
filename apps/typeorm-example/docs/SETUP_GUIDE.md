# Complete Setup Guide

This guide covers the complete CDC pipeline setup, architecture, and troubleshooting.

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Startup Flow](#startup-flow)
- [Setup Issues & Fixes](#setup-issues--fixes)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Docker + Docker Compose
- Node.js 20+ and pnpm
- Moose CLI: `bash -i <(curl -fsSL https://fiveonefour.com/install.sh) moose`
- **Redpanda Enterprise License** (required for `postgres_cdc`)

### Step 1: Set License

```bash
cd apps/typeorm-example

# Export license
export REDPANDA_LICENSE="your_license_key"

# Or create .env file
echo "REDPANDA_LICENSE=your_license_key" > .env
```

Get a free trial: https://redpanda.com/try-enterprise

### Step 2: Start Infrastructure

```bash
moose dev
```

**Expected output:**

```
✅ PostgreSQL is ready!
⏳ Waiting for tables to be created by TypeORM API...
ℹ️  Redpanda Connect hasn't started yet (waiting for publication)
```

### Step 3: Start API (Creates Tables)

```bash
# In a new terminal
pnpm dev
```

**What happens automatically:**

1. TypeORM creates tables
2. `cdc-setup` detects tables and creates publication
3. Redpanda Connect starts
4. CDC begins streaming! ✨

### Step 4: Verify

```bash
# Check Redpanda Connect
curl http://localhost:4195/ready

# View CDC topics
docker exec redpanda rpk topic list

# Consume events
docker exec redpanda rpk topic consume typeorm.public.customers --num 5
```

---

## Architecture

### Component Flow

```
┌──────────────┐   CDC    ┌──────────────────┐   Kafka   ┌─────────────┐
│  PostgreSQL  │ ───────▶ │ Redpanda Connect │ ────────▶ │  Redpanda   │
│    (OLTP)    │  WAL     │  (postgres_cdc)  │  Topics   │   (Broker)  │
└──────────────┘          └──────────────────┘           └──────┬──────┘
                                                                 │
                                                                 ▼
┌──────────────┐          ┌──────────────────┐           ┌─────────────┐
│  ClickHouse  │ ◀─────── │   Moose Flows    │ ◀──────── │   Topics    │
│    (OLAP)    │          │ (Transformations)│           │  (Stream)   │
└──────────────┘          └──────────────────┘           └─────────────┘
```

### Services

| Service              | Purpose                | Starts                   |
| -------------------- | ---------------------- | ------------------------ |
| **postgres**         | OLTP database with WAL | Immediately              |
| **redpanda**         | Kafka broker           | Immediately              |
| **clickhouse**       | OLAP database          | Immediately              |
| **cdc-setup**        | Creates publication    | After tables exist       |
| **redpanda-connect** | CDC connector          | After publication exists |

---

## Startup Flow

### The Problem We Solved

The PostgreSQL publication must be created:

- ✅ **After** tables exist (TypeORM creates them)
- ✅ **Before** Redpanda Connect tries to connect

### The Solution: 4-Stage Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Stage 1: PostgreSQL starts                                 │
│  ✅ Automatic (moose dev)                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 2: TypeORM API creates tables                        │
│  👤 Manual: pnpm dev                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 3: cdc-setup creates publication                     │
│  ✅ Automatic (waits for tables)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 4: Redpanda Connect starts CDC                       │
│  ✅ Automatic (waits for publication)                       │
└─────────────────────────────────────────────────────────────┘
```

### Stage Details

#### Stage 1: PostgreSQL

```yaml
services:
  postgres:
    image: postgres:15-alpine
    command:
      - postgres
      - -c
      - wal_level=logical # Required for CDC
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
```

#### Stage 2: TypeORM API

```typescript
const AppDataSource = new DataSource({
  type: 'postgres',
  synchronize: true, // Creates tables automatically
  entities: [Customer, Product, Order, OrderItem],
});
```

You run: `pnpm dev`

#### Stage 3: CDC Setup

```yaml
services:
  cdc-setup:
    image: postgres:15-alpine
    environment:
      PGHOST: ${OLTP_POSTGRES_CONTAINER:-typeorm-oltp-postgres}
      PGDATABASE: ${OLTP_POSTGRES_DB:-typeorm_db}
      POSTGRES_CDC_TABLES: ${POSTGRES_CDC_TABLES:-customers,products,orders,order_items}
    volumes:
      - ../../packages/shared/cdc/init-postgres-cdc.sh:/init-postgres-cdc.sh:ro
    command: ["/bin/sh", "/init-postgres-cdc.sh"]
    restart: 'no' # One-time service
```

Creates:

```sql
CREATE PUBLICATION redpanda_cdc_publication FOR TABLE
    public.customers,
    public.products,
    public.orders,
    public.order_items;

SELECT pg_create_logical_replication_slot('redpanda_cdc_slot', 'pgoutput');
```

#### Stage 4: Redpanda Connect

```yaml
services:
  redpanda-connect:
    depends_on:
      cdc-setup:
        condition: service_completed_successfully
```

Only starts after publication exists.

---

## Setup Issues & Fixes

### Issue 1: Mount Error (Fixed)

**Error:**

```
Error mounting ".moose/connect.yaml" ... not a directory
```

**Cause:** `.moose/connect.yaml` existed as a directory instead of a file.

**Fix:** Copy config file properly.

### Issue 2: Invalid Configuration (Fixed)

**Errors:**

```
field publication_name not recognised
field snapshot_mode not recognised
field schema is required
```

**Cause:** Used incorrect field names (Debezium-style vs Redpanda Connect).

**Fix:** Updated configuration with correct schema:

```yaml
input:
  postgres_cdc:
    dsn: '...'
    schema: 'public' # Required
    slot_name: 'redpanda_cdc_slot'
    tables: [...]
```

### Issue 3: No Space Left (Fixed)

**Error:**

```
write: No space left on device
```

**Cause:** Docker volumes filled up.

**Fix:** Clean up old volumes:

```bash
docker system prune -a --volumes -f
```

### Issue 4: Publication Order (Fixed)

**Error:**

```
Publication 'redpanda_cdc_publication' does not exist
```

**Cause:** Redpanda Connect started before publication was created.

**Fix:** Added `cdc-setup` service that waits for tables, then creates publication before Redpanda Connect starts.

### Issue 5: Missing License (Requires Action)

**Error:**

```
requires a valid Redpanda Enterprise Edition license
```

**Cause:** `postgres_cdc` is an enterprise feature.

**Fix:** Set your license:

```bash
export REDPANDA_LICENSE="your_license_key"
```

Get free trial: https://redpanda.com/try-enterprise

---

## Troubleshooting

### Redpanda Connect Not Starting

**Symptom:** Container keeps exiting

**Check logs:**

```bash
docker logs typeorm-redpanda-connect
```

**Common causes:**

1. **No license:**

   ```
   requires a valid Redpanda Enterprise Edition license
   ```

   **Fix:** Set `REDPANDA_LICENSE` environment variable

2. **Publication doesn't exist:**

   ```
   publication 'redpanda_cdc_publication' does not exist
   ```

   **Fix:** Start the API: `pnpm dev`

3. **Configuration error:**
   ```
   field X not recognised
   ```
**Fix:** Check the environment variables feeding `connect.yaml`

### "Waiting for Tables" Persists

**Symptom:** `cdc-setup` keeps waiting

**Check:**

```bash
docker logs typeorm-cdc-setup
```

**Fix:** Start the TypeORM API:

```bash
pnpm dev
```

### Publication Already Exists Error

**Check manually:**

```bash
docker exec typeorm-oltp-postgres psql -U postgres -d typeorm_db \
  -c "SELECT * FROM pg_publication"
```

**Fix:** The init script is idempotent and will skip if exists. No action needed.

### Clean Slate Reset

```bash
# Stop Moose (Ctrl+C)

# Remove containers
docker rm -f typeorm-oltp-postgres typeorm-redpanda-connect typeorm-cdc-setup

# Remove volumes
docker volume rm example-typeorm-to-olap_postgres_data

# Restart
export REDPANDA_LICENSE="your_key"
moose dev
```

### Verify Everything is Working

```bash
# 1. Check all containers
docker ps

# Should see:
# - typeorm-oltp-postgres (Up, healthy)
# - typeorm-redpanda-connect (Up)
# - example-typeorm-to-olap-redpanda-1 (Up, healthy)
# - example-typeorm-to-olap-clickhousedb-1 (Up, healthy)

# 2. Check Redpanda Connect health
curl http://localhost:4195/ready

# 3. Check publication exists
docker exec typeorm-oltp-postgres psql -U postgres -d typeorm_db \
  -c "SELECT * FROM pg_publication WHERE pubname='redpanda_cdc_publication'"

# 4. Check replication slot
docker exec typeorm-oltp-postgres psql -U postgres -d typeorm_db \
  -c "SELECT * FROM pg_replication_slots WHERE slot_name='redpanda_cdc_slot'"

# 5. Check topics exist
docker exec redpanda rpk topic list

# 6. Create test data and verify CDC
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","country":"USA","city":"NYC"}'

# 7. Check event in Redpanda
docker exec redpanda rpk topic consume typeorm.public.customers --num 1
```

---

## Configuration Files

| File                               | Purpose                                  |
| ---------------------------------- | ---------------------------------------- |
| `docker-compose.dev.override.yaml` | Service definitions and dependencies     |
| `../../packages/shared/cdc/init-postgres-cdc.sh` | Creates publication and replication slot |
| `../../packages/shared/cdc/redpanda-connect.template.yaml` | Redpanda Connect CDC configuration |
| `setup-cdc.sh`                     | Moose hook to verify setup               |

---

## Production Considerations

### 1. Pre-create Tables

Use migrations instead of TypeORM `synchronize`:

```typescript
const AppDataSource = new DataSource({
  synchronize: false, // Disable in production
  migrations: ['./migrations/*.ts'],
});
```

### 2. Init Job

Run `cdc-setup` as a Kubernetes init container or job.

### 3. Health Checks

Monitor Redpanda Connect:

```bash
curl http://redpanda-connect:4195/ready
curl http://redpanda-connect:4195/metrics
```

### 4. Alerting

Alert if:

- Publication doesn't exist
- Replication slot is inactive
- CDC lag exceeds threshold

### 5. Backup Replication Slot

Replication slots prevent WAL cleanup. Monitor disk usage:

```sql
SELECT slot_name, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS lag
FROM pg_replication_slots;
```

---

## References

- [PostgreSQL Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)
- [Redpanda Connect](https://docs.redpanda.com/redpanda-connect/)
- [Redpanda Connect postgres_cdc](https://docs.redpanda.com/redpanda-connect/components/inputs/postgres_cdc/)
- [Moose Documentation](https://docs.fiveonefour.com/moose/)
- [Docker Compose depends_on](https://docs.docker.com/compose/compose-file/05-services/#depends_on)
