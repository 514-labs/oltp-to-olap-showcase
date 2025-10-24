# TypeORM CDC Example

**Real-time PostgreSQL CDC → Moose → ClickHouse**

Transform TypeORM entities into denormalized OLAP tables with real-time CDC replication.

## 🎯 What This Does

- ✅ TypeORM entities automatically streamed to ClickHouse
- ✅ Real-time CDC using Redpanda Connect
- ✅ Denormalized star schema for fast analytics
- ✅ Express API with OpenAPI docs
- ✅ React test client included

**Architecture:** PostgreSQL → Redpanda Connect → Redpanda → Moose Flows → ClickHouse

## 🚀 Quick Start

⚠️ **Requires [Redpanda Enterprise License](./docs/LICENSE_SETUP.md)** - Free 30-day trial available

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ and pnpm installed
- Redpanda Enterprise License ([get free 30-day trial](https://redpanda.com/try-enterprise))

### 1. Set License

```bash
export REDPANDA_LICENSE="your_license_key_here"
```

### 2. Start Infrastructure

```bash
# Terminal 1: Start Moose (keeps running)
moose dev
```

**Expected Output:**
```
🟢 Moose is running
⏳ Waiting for tables to be created by TypeORM API...
```

**What this does:** Starts the complete CDC infrastructure (Redpanda, ClickHouse, Moose flows). Moose will wait for PostgreSQL tables to be created before starting the CDC connector.

### 3. Start OLTP Application

```bash
# Terminal 2: Start PostgreSQL and API
pnpm start-oltp  # Starts PostgreSQL
pnpm dev         # Starts API server
```

**Expected Output from `pnpm start-oltp`:**
```
════════════════════════════════════════════════════════════
  Starting OLTP Application (TypeORM + PostgreSQL)
════════════════════════════════════════════════════════════

📦 Step 1: Starting PostgreSQL...
✅ PostgreSQL is ready

📋 Step 2: Creating database tables...
✅ Database tables created

════════════════════════════════════════════════════════════
  ✅ OLTP Application Ready
════════════════════════════════════════════════════════════
```

**Expected Output from `pnpm dev`:**
```
> typeorm-example@1.0.0 dev
> tsx watch src/index.ts

🚀 TypeORM Express API listening on port 3000
📖 API documentation: http://localhost:3000/reference
```

**What this does:**

1. **start-oltp**: Starts PostgreSQL with logical replication enabled, creates TypeORM tables
2. **dev**: Starts Express API server, triggers CDC setup through Moose hooks
3. CDC setup automatically creates PostgreSQL publication and replication slot
4. Redpanda Connect begins streaming changes to ClickHouse

**Check CDC is running:** Terminal 1 (Moose) should now show:
```
✅ CDC connector started successfully
🔄 Streaming changes from PostgreSQL to ClickHouse
```

### 4. Verify the CDC Pipeline

**Step 1: Check all services are healthy**
```bash
# PostgreSQL health
docker exec -it typeorm-oltp-postgres pg_isready

# API health
curl http://localhost:3000/health

# Redpanda Connect health
curl http://localhost:4195/ready

# Expected: {"status": "ok"}
```

**Step 2: Create test data**
```bash
# Create a customer
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User", "country": "USA", "city": "NYC"}'

# Expected response:
# {"id": 1, "email": "test@example.com", "name": "Test User", "country": "USA", "city": "NYC"}

# Create a product
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Laptop", "category": "Electronics", "price": 999.99}'

# Expected response:
# {"id": 1, "name": "Laptop", "category": "Electronics", "price": 999.99}

# Create an order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId": 1, "status": "pending", "total": 999.99}'

# Expected response:
# {"id": 1, "customerId": 1, "status": "pending", "total": 999.99, ...}
```

**Step 3: Verify data in PostgreSQL (source)**
```bash
# Connect to PostgreSQL
docker exec -it typeorm-oltp-postgres psql -U postgres -d typeorm_db

# Query data
SELECT * FROM customers;
SELECT * FROM products;
SELECT * FROM orders;

# Exit PostgreSQL
\q
```

**Expected Output:**
```
 id |       email       |   name    | country | city
----+-------------------+-----------+---------+------
  1 | test@example.com | Test User | USA     | NYC
```

**Step 4: Check CDC publication and slot**
```bash
docker exec -it typeorm-oltp-postgres psql -U postgres -d typeorm_db -c "SELECT * FROM pg_publication;"
```

**Expected Output:**
```
         pubname          | pubowner | puballtables | pubinsert | pubupdate | pubdelete
--------------------------+----------+--------------+-----------+-----------+-----------
 redpanda_cdc_publication |       10 | f            | t         | t         | t
```

```bash
docker exec -it typeorm-oltp-postgres psql -U postgres -d typeorm_db -c "SELECT slot_name, plugin, active FROM pg_replication_slots;"
```

**Expected Output:**
```
      slot_name       |  plugin  | active
----------------------+----------+--------
 redpanda_cdc_slot    | pgoutput | t
```

**Step 5: Verify data in ClickHouse (destination)**
```bash
# Connect to ClickHouse
docker exec -it moose-clickhouse clickhouse-client -u panda --password pandapass

# Query denormalized dimension tables
SELECT * FROM local.customer_dim LIMIT 10;
SELECT * FROM local.product_dim LIMIT 10;

# Query denormalized fact tables
SELECT * FROM local.order_fact LIMIT 10;
SELECT * FROM local.orderitem_fact LIMIT 10;

# Exit ClickHouse
exit
```

**Expected Output for customer_dim:**
```
┌─customer_id─┬─customer_name─┬─customer_email───┬─country─┬─city─┬─is_deleted─┬──────────lsn─┐
│           1 │ Test User     │ test@example.com │ USA     │ NYC  │          0 │ 0/1A2B3C4    │
└─────────────┴───────────────┴──────────────────┴─────────┴──────┴────────────┴──────────────┘
```

**Step 6: Verify real-time CDC is working**
```bash
# Update a customer
curl -X PUT http://localhost:3000/api/customers/1 \
  -H "Content-Type: application/json" \
  -d '{"city": "San Francisco"}'

# Wait 2-3 seconds for CDC to process

# Query ClickHouse again
docker exec -it moose-clickhouse clickhouse-client -u panda --password pandapass \
  -q "SELECT customer_id, customer_name, city, lsn FROM local.customer_dim WHERE customer_id = 1 ORDER BY lsn DESC LIMIT 5;"
```

**Expected:** You should see the updated city value, demonstrating real-time CDC!

### 5. Test with Interactive UI (Optional)

```bash
# Terminal 3: Start test client
cd ../test-client
pnpm install
pnpm dev
```

Visit http://localhost:3001 to:
- Generate random customers and products
- Create orders with multiple items
- Update order status
- Delete orders
- Watch real-time CDC in action

## 📖 Documentation

### Essential Guides

- **[Quick Start](docs/MOOSE_CDC_QUICKSTART.md)** - Get running in 5 minutes
- **[License Setup](LICENSE_SETUP.md)** - Get your Redpanda license
- **[Complete Setup Guide](docs/SETUP_GUIDE.md)** - Detailed setup with troubleshooting

### Architecture & Design

- **[CDC Pipeline Design](docs/CDC_PIPELINE_DESIGN.md)** - How the CDC pipeline works
- **[OLAP Conversion Guide](docs/OLAP_CONVERSION_GUIDE.md)** - TypeORM → Moose patterns
- **[Fact Table Strategy](docs/FACT_TABLE_STRATEGY.md)** - Denormalization patterns
- **[Documentation Index](docs/README.md)** - All documentation

## 🏗️ Project Structure

```
typeorm-example/
├── src/
│   ├── entities/           # TypeORM OLTP entities
│   │   ├── Customer.ts
│   │   ├── Product.ts
│   │   ├── Order.ts
│   │   └── OrderItem.ts
│   ├── index.ts            # Express API server
│   ├── openapi.ts          # OpenAPI specification
│   └── setup-db.ts         # Database initialization
│
├── app/
│   ├── index.ts            # Moose OLAP table definitions
│   └── streams/            # (Auto-generated streaming functions)
│
├── docs/                   # Complete documentation
│
├── docker-compose.oltp.yaml           # PostgreSQL service
├── docker-compose.dev.override.yaml   # CDC services
├── (uses ../../packages/shared/cdc/redpanda-connect.template.yaml)
├── moose.config.toml                  # Moose settings
│
├── start-oltp.sh           # Start OLTP (PostgreSQL + setup)
├── moose-cdc-setup.sh      # CDC setup hook (auto-run by Moose)
└── (uses ../../packages/shared/cdc/init-postgres-cdc.sh)
```

## 🎓 How It Works

### TypeORM Entities (OLTP)

```typescript
// src/entities/Order.ts
@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @ManyToOne(() => Customer)
  customer: Customer;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];
}
```

### Moose OLAP Tables

```typescript
// app/index.ts
export interface OrderFact {
  order_id: UInt64;
  customer_id: UInt64;
  customer_name: string; // Denormalized!
  customer_email: string; // Denormalized!
  status: string;
  total: Float64;
  order_date: DateTime;
}

export const OrderFact = new OlapTable<OrderFact>('order_fact', {
  orderByFields: ['order_date', 'order_id'],
});
```

### CDC Event Flow

```
TypeORM           PostgreSQL        Redpanda          Moose            ClickHouse
Insert   ──────>   WAL      ──────>  Connect  ──────>  Flow   ──────>  Table
Order              Capture           Stream            Transform         Insert
```

## 🚨 Troubleshooting

### PostgreSQL Won't Start

**Symptom:** `start-oltp.sh` fails or PostgreSQL container exits

**Diagnostic:**
```bash
# Check if container is running
docker ps | grep typeorm-oltp-postgres

# Check container logs
docker logs typeorm-oltp-postgres
```

**Solutions:**

1. **Port conflict** - Another service using port 5433
   ```bash
   # Check what's using the port
   lsof -i :5433

   # Stop conflicting service or change port in docker-compose.oltp.yaml
   ```

2. **Docker daemon not running**
   ```bash
   # Start Docker Desktop or Docker daemon
   ```

3. **Insufficient resources**
   ```bash
   # Check Docker resources (Memory, CPU) in Docker Desktop settings
   ```

### "Waiting for tables" Persists in Moose

**Symptom:** Moose shows "Waiting for tables to be created by TypeORM API..." indefinitely

**Cause:** TypeORM hasn't created tables yet, or `POSTGRES_CDC_WAIT_FOR_TABLE` references wrong table

**Solutions:**

1. **Run the API server** to create tables
   ```bash
   pnpm dev
   # This runs TypeORM synchronize which creates tables
   ```

2. **Manually create tables** if API won't start
   ```bash
   pnpm setup-db
   ```

3. **Check table name is correct**
   ```bash
   docker exec -it typeorm-oltp-postgres psql -U postgres -d typeorm_db -c "\dt"
   # Verify "customers" table exists (not "customer")
   ```

### Redpanda Connect Won't Start

**Symptom:** `redpanda-connect` container keeps restarting

**Diagnostic:**
```bash
# Check logs
docker logs typeorm-redpanda-connect

# Check if it's running
docker ps | grep redpanda-connect
```

**Solutions:**

1. **Missing Redpanda license**
   ```
   Error: REDPANDA_LICENSE environment variable is required
   ```
   Solution:
   ```bash
   export REDPANDA_LICENSE="your_license_key_here"
   # Restart Moose
   ```

2. **Invalid license**
   ```
   Error: invalid license
   ```
   Solution: Get a new license from https://redpanda.com/try-enterprise

3. **CDC setup failed**
   ```
   Error: publication "redpanda_cdc_publication" does not exist
   ```
   Solution: Check cdc-setup container completed successfully
   ```bash
   docker logs typeorm-cdc-setup
   # Should show "✅ CDC primitives ready"
   ```

4. **Wrong connection string**
   ```
   Error: failed to connect to PostgreSQL
   ```
   Solution: Verify DSN includes `?sslmode=disable`
   ```bash
   # In docker-compose.dev.override.yaml
   POSTGRES_CDC_DSN: postgres://postgres:postgres@typeorm-oltp-postgres:5432/typeorm_db?sslmode=disable
   ```

### No Data Appearing in ClickHouse

**Symptom:** PostgreSQL has data but ClickHouse tables are empty

**Diagnostic steps:**

**Step 1: Verify Redpanda Connect is healthy**
```bash
curl http://localhost:4195/ready
# Should return: {"status": "ok"}
```

**Step 2: Check if publication is tracking tables**
```bash
docker exec -it typeorm-oltp-postgres psql -U postgres -d typeorm_db

SELECT * FROM pg_publication_tables WHERE pubname = 'redpanda_cdc_publication';
# Should show: customers, products, orders, order_items
```

**Step 3: Check replication slot is active**
```sql
SELECT slot_name, active, restart_lsn FROM pg_replication_slots WHERE slot_name = 'redpanda_cdc_slot';
-- active should be 't' (true)
```

**Step 4: Check Redpanda topic has events**
```bash
docker exec -it redpanda-0 rpk topic list
# Should show: typeorm_cdc_events

docker exec -it redpanda-0 rpk topic consume typeorm_cdc_events --num 5
# Should show CDC events
```

**Step 5: Check Moose is consuming**
```bash
# Look at Moose console logs
# Should show events being processed

# Check Moose UI
open http://localhost:5001
```

**Step 6: Verify ClickHouse tables exist**
```bash
docker exec -it moose-clickhouse clickhouse-client -u panda --password pandapass

SHOW TABLES FROM local;
-- Should show: customer_dim, product_dim, order_fact, orderitem_fact

DESCRIBE local.customer_dim;
-- Verify schema is correct
```

### Table Name Mismatches

**Symptom:** CDC connector errors mentioning table names

**Solution:** Ensure table names in all configs match exactly:

TypeORM uses **plural** table names by default: `customers`, `products`, `orders`, `order_items`

**Check these files:**
1. `docker-compose.dev.override.yaml`:
   ```yaml
   POSTGRES_CDC_TABLES: customers,products,orders,order_items
   POSTGRES_CDC_TABLES_JSON: ["customers","products","orders","order_items"]
   POSTGRES_CDC_WAIT_FOR_TABLE: customers
   ```

2. TypeORM entities:
   ```typescript
   @Entity('customers')  // Must match CDC config
   export class Customer { ... }
   ```

### Replication Slot Lag

**Symptom:** Data takes a long time to appear in ClickHouse

**Check lag:**
```bash
docker exec -it typeorm-oltp-postgres psql -U postgres -d typeorm_db

SELECT
  slot_name,
  active,
  pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) / 1024 / 1024 AS lag_mb
FROM pg_replication_slots
WHERE slot_name = 'redpanda_cdc_slot';
```

**Solutions:**

1. **Restart Redpanda Connect** if lag is growing
   ```bash
   docker restart typeorm-redpanda-connect
   ```

2. **Check Moose processing** - Slow transformations can cause backpressure
   ```bash
   # Monitor Moose console for slow queries
   ```

### API Connection Errors

**Symptom:** API can't connect to PostgreSQL

**Diagnostic:**
```bash
# Check API logs
# Look for connection errors

# Test connection manually
docker exec -it typeorm-oltp-postgres psql -U postgres -d typeorm_db -c "SELECT 1;"
```

**Solutions:**

1. **Check DATABASE_URL** environment variable
   ```bash
   # Should be:
   DATABASE_URL=postgresql://postgres:postgres@localhost:5433/typeorm_db
   ```

2. **Verify port mapping**
   ```bash
   docker ps | grep typeorm-oltp-postgres
   # Should show: 0.0.0.0:5433->5432/tcp
   ```

### Reset Everything

**When all else fails, complete reset:**

```bash
# Stop all services
docker compose -f ../../packages/shared/cdc/docker-compose.postgres.yaml \
  -f docker-compose.oltp.yaml \
  -f docker-compose.dev.override.yaml down -v

# Remove volumes (WARNING: destroys all data)
docker volume rm typeorm-example_postgres-data

# Restart from scratch
export REDPANDA_LICENSE="your_license_key"
moose dev          # Terminal 1
pnpm start-oltp    # Terminal 2
pnpm dev           # Terminal 2 (after start-oltp completes)
```

### Enable Debug Logging

**For more verbose output:**

```yaml
# In docker-compose.dev.override.yaml
redpanda-connect:
  environment:
    LOG_LEVEL: debug  # Change from 'info' to 'debug'
```

Then restart:
```bash
docker restart typeorm-redpanda-connect
docker logs -f typeorm-redpanda-connect
```

### Check Shared CDC Configuration

For detailed information about the CDC infrastructure and environment variables:

**See:** [Shared CDC Documentation](../../packages/shared/cdc/README.md)

### More Help

- **[Complete Setup Guide](docs/SETUP_GUIDE.md)** - Detailed setup with advanced troubleshooting
- **[CDC Pipeline Design](docs/CDC_PIPELINE_DESIGN.md)** - Architecture deep dive
- **[Shared CDC README](../../packages/shared/cdc/README.md)** - Template system documentation

## 🔗 Useful Links

**API Endpoints:**

- API Server: http://localhost:3000
- API Documentation: http://localhost:3000/reference
- Redpanda Connect Health: http://localhost:4195/ready

**Admin UIs:**

- Moose Console: http://localhost:5001
- Test Client: http://localhost:3001

## 📦 Available Scripts

```bash
pnpm start-oltp    # Start PostgreSQL
pnpm stop-oltp     # Stop PostgreSQL
pnpm setup-db      # Initialize database tables
pnpm dev           # Start API server (dev mode)
pnpm build         # Build TypeScript
```

## 🛠️ Technology Stack

- **OLTP:** PostgreSQL 15 + TypeORM 0.3
- **CDC:** Redpanda Connect (Enterprise) + PostgreSQL CDC connector
- **Streaming:** Redpanda (Kafka-compatible)
- **OLAP:** Moose 0.6 + ClickHouse
- **API:** Express + Scalar OpenAPI docs
- **Language:** TypeScript 5

## 📚 Learn More

- [Moose Documentation](https://docs.fiveonefour.com/moose/)
- [Redpanda Connect PostgreSQL CDC](https://docs.redpanda.com/redpanda-connect/components/inputs/postgres_cdc/)
- [PostgreSQL Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)
- [ClickHouse Documentation](https://clickhouse.com/docs/)
- [TypeORM Documentation](https://typeorm.io/)

---

**Need help?** Check the **[Documentation Index](docs/README.md)** or open an issue.
