# Quick Start Guide

Get the OLTP-to-OLAP CDC pipeline running in 5 minutes. This guide walks you through setup, verification, and testing.

## Prerequisites

Before you begin, ensure you have:

- **Docker Desktop** installed and running
- **Node.js 18+** (for TypeORM example) or **Python 3.10+** (for SQLAlchemy example)
- **pnpm** (for TypeORM): `npm install -g pnpm`
- **Redpanda Enterprise License** - [Get free 30-day trial](https://redpanda.com/try-enterprise)

## Choose Your Path

Pick the ORM that matches your stack:

- **TypeScript developers** → [TypeORM Example](#typeorm-example-typescript)
- **Python developers** → [SQLModel Example](#sqlmodel-example-python)

Both implement the identical CDC architecture, just with different languages and ORMs.

**What is SQLModel?** A modern Python library that combines SQLAlchemy (database) and Pydantic (validation) into a single model definition. Created by FastAPI's author for seamless FastAPI integration.

---

## TypeORM Example (TypeScript)

### Step 1: Set Up License

```bash
export REDPANDA_LICENSE="your_license_key_here"
```

**Windows (PowerShell):**
```powershell
$env:REDPANDA_LICENSE="your_license_key_here"
```

### Step 2: Navigate to Example

```bash
cd apps/typeorm-example
```

### Step 3: Start Infrastructure

**Terminal 1:**
```bash
moose dev
```

You'll see: `⏳ Waiting for tables to be created...`

This starts:
- ClickHouse (analytics database)
- Redpanda (Kafka-compatible streaming)
- Moose (stream processing)

### Step 4: Start OLTP Application

**Terminal 2:**
```bash
# Start PostgreSQL with CDC enabled
pnpm start-oltp

# In another terminal or after PostgreSQL is ready
pnpm dev
```

This starts:
- PostgreSQL with logical replication
- Express API server on port 3000

The first terminal (Moose) will detect tables and start the CDC connector automatically.

### Step 5: Verify It Works

**Check API:**
```bash
curl http://localhost:3000/health
```

**Create test data:**
```bash
# Create a customer
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "country": "USA",
    "city": "New York"
  }'

# Create a product
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop",
    "category": "Electronics",
    "price": 999.99
  }'
```

**Verify CDC pipeline:**
```bash
# Connect to ClickHouse
docker exec -it moose-clickhouse clickhouse-client -u panda --password pandapass

# Query the data (should appear within 1 second)
SELECT * FROM local.dim_customer LIMIT 10;
SELECT * FROM local.dim_product LIMIT 10;
```

**View API docs:**
Open http://localhost:3000/reference in your browser.

### Step 6: Test with UI (Optional)

**Terminal 3:**
```bash
cd ../test-client
pnpm install
pnpm dev
```

Visit http://localhost:3001 to create data interactively.

### TypeORM Next Steps

- Read the [TypeORM Example README](apps/typeorm-example/README.md)
- Explore [CDC Pipeline Design](apps/typeorm-example/docs/CDC_PIPELINE_DESIGN.md)
- Check [OLAP Conversion Guide](apps/typeorm-example/docs/OLAP_CONVERSION_GUIDE.md)

---

## SQLModel Example (Python)

### Step 1: Set Up License

```bash
export REDPANDA_LICENSE="your_license_key_here"
```

**Windows (PowerShell):**
```powershell
$env:REDPANDA_LICENSE="your_license_key_here"
```

### Step 2: Navigate and Install

```bash
cd apps/sqlmodel-example

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate     # Windows

# Install dependencies
pip install -e .
```

### Step 3: Start PostgreSQL

**Terminal 1:**
```bash
./start-oltp.sh
```

Starts PostgreSQL with CDC configuration on port 5434.

### Step 4: Start Infrastructure

**Terminal 2:**
```bash
moose dev
```

You'll see: `⏳ Waiting for tables to be created...`

This starts ClickHouse, Redpanda, and Moose.

### Step 5: Initialize Database and Start API

**Terminal 3:**
```bash
# Activate virtual environment (if not already active)
source venv/bin/activate

# Create database tables
python init_db.py

# Start FastAPI server
fastapi dev src/main.py --port 3002
```

The Moose terminal will detect tables and start the CDC connector.

### Step 6: Verify It Works

**Check API:**
```bash
curl http://localhost:3002/health
```

**Create test data:**
```bash
# Create a customer
curl -X POST http://localhost:3002/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "name": "Jane Doe",
    "country": "Canada",
    "city": "Toronto"
  }'

# Create a product
curl -X POST http://localhost:3002/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Mouse",
    "category": "Electronics",
    "price": "29.99"
  }'
```

**Verify CDC pipeline:**
```bash
# Connect to ClickHouse
docker exec -it moose-clickhouse clickhouse-client -u panda --password pandapass

# Query the data (should appear within 1 second)
SELECT * FROM local.customer_dim LIMIT 10;
SELECT * FROM local.product_dim LIMIT 10;
```

**View API docs:**
Open http://localhost:3002/docs in your browser.

### Step 7: Test with UI (Optional)

**Terminal 4:**
```bash
cd ../test-client
pnpm install
pnpm dev
```

Visit http://localhost:3001 to create data interactively.

### SQLModel Next Steps

- Read the [SQLModel Example README](apps/sqlalchemy-example/README.md)
- Learn about [Why SQLModel?](apps/sqlalchemy-example/docs/WHY_SQLMODEL.md) - Benefits and architecture
- Review table naming conventions (singular, no underscores)
- Check common troubleshooting tips

**Why SQLModel?**
- Single model = database table + API validation
- Automatic Pydantic validation
- Less code than traditional SQLAlchemy + Pydantic
- Perfect FastAPI integration

---

## Understanding the Pipeline

### What Just Happened?

1. **You created data** via REST API
2. **PostgreSQL stored it** in normalized tables (customers, products, orders)
3. **CDC captured changes** from PostgreSQL's Write-Ahead Log
4. **Redpanda streamed events** via Kafka topics
5. **Moose transformed data** (denormalized, enriched)
6. **ClickHouse stored it** in analytics-optimized tables

All in under 1 second.

### Data Flow

```
Your API Request
      ↓
PostgreSQL (OLTP)
      ↓ WAL
Redpanda Connect (CDC)
      ↓ Kafka Topics
Redpanda (Streaming)
      ↓ Stream Processing
Moose (Transformations)
      ↓ INSERT
ClickHouse (OLAP)
```

### Try an Analytics Query

Connect to ClickHouse and run:

```sql
-- Orders by customer country
SELECT
  customer_country,
  COUNT(DISTINCT order_id) as order_count,
  SUM(total) as total_revenue
FROM local.order_fact
WHERE is_deleted = 0
GROUP BY customer_country
ORDER BY total_revenue DESC;
```

Notice: **No JOINs needed** - customer data is already denormalized into the order fact table.

## Common Issues

### "Waiting for tables" persists

**Cause:** API server not started yet.

**Solution:** Make sure you ran `pnpm dev` (TypeORM) or `fastapi dev src/main.py --port 3002` (SQLAlchemy).

### Redpanda Connect won't start

**Cause:** License not set or invalid.

**Solution:**
```bash
# Check license is set
echo $REDPANDA_LICENSE

# Re-export if needed
export REDPANDA_LICENSE="your_license_key_here"
```

### Data not appearing in ClickHouse

**Troubleshooting checklist:**

1. **Check PostgreSQL data exists:**
   ```bash
   # TypeORM
   docker exec -it typeorm-oltp-postgres psql -U postgres -d typeorm_db -c "SELECT COUNT(*) FROM customers;"

   # SQLModel
   docker exec -it sqlmodel-postgres psql -U postgres -d sqlalchemy_db -c "SELECT COUNT(*) FROM customer;"
   ```

2. **Check Moose is running:** Look for errors in Terminal 2 output

3. **Check CDC connector:**
   ```bash
   curl http://localhost:4195/ready
   ```

4. **Check ClickHouse tables exist:**
   ```bash
   docker exec -it moose-clickhouse clickhouse-client -u panda --password pandapass
   SHOW TABLES FROM local;
   ```

5. **Review table names match:** Ensure `POSTGRES_CDC_TABLES` / `POSTGRES_CDC_TABLES_JSON` in your compose file includes the correct tables

### Port already in use

**Solution:**
```bash
# Find and kill process using the port
# macOS/Linux
lsof -ti:3000 | xargs kill -9   # TypeORM
lsof -ti:3002 | xargs kill -9   # SQLModel

# Windows
netsh interface ipv4 show excludedportrange protocol=tcp
```

## Next Steps

### Learn the Architecture

- [Main README](README.md) - Full project overview
- [CDC Pipeline Design](apps/typeorm-example/docs/CDC_PIPELINE_DESIGN.md) - How CDC works
- [OLAP Conversion Guide](apps/typeorm-example/docs/OLAP_CONVERSION_GUIDE.md) - ORM to analytics

### Test the Pipeline

- [Test Client Guide](apps/test-client/README.md) - Interactive testing
- Generate random data and watch CDC in action
- Query ClickHouse to verify data flow

### Customize for Your Use Case

1. **Modify the models** - Add your own entities
2. **Update CDC config** - Override the `POSTGRES_CDC_*` environment variables that feed the shared template in `packages/shared/cdc`
3. **Create transformations** - Edit Moose functions in `app/`
4. **Design analytics tables** - Optimize for your queries

## Stopping the Services

### TypeORM

```bash
# Stop API (Ctrl+C in terminal)
# Stop Moose (Ctrl+C in terminal)

# Stop PostgreSQL
pnpm stop-oltp

# Clean up Docker
docker-compose -f docker-compose.oltp.yaml down
```

### SQLModel

```bash
# Stop API (Ctrl+C in terminal)
# Stop Moose (Ctrl+C in terminal)

# Stop PostgreSQL
docker-compose -f docker-compose.oltp.yaml down
```

## Getting Help

- **Issues?** Check the [main README](README.md) troubleshooting section
- **Questions?** Open an issue on GitHub
- **Documentation:** See individual app READMEs for detailed guides

---

**Congratulations!** You now have a working OLTP-to-OLAP CDC pipeline.

Explore the [main documentation](README.md) to learn more about the architecture and design patterns.
