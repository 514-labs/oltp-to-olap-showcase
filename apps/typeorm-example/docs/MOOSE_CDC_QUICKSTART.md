# TypeORM + Moose CDC Quick Start

Run the complete OLTP → OLAP CDC pipeline with one command using Moose's dev environment.

Uses **Redpanda Connect** (enterprise) with native PostgreSQL CDC connector.

## What This Does

```
TypeORM API (OLTP) → PostgreSQL → Redpanda Connect → Redpanda → Moose Flows → ClickHouse (OLAP)
```

**Key Features:**

- ✅ Single command startup (`moose dev`)
- ✅ Automatic CDC setup via `setup-cdc.sh`
- ✅ **Redpanda Connect** with enterprise PostgreSQL CDC connector
- ✅ Moose manages all infrastructure lifecycle
- ✅ PostgreSQL with logical replication
- ✅ Type-safe TypeORM → Moose transformations
- ✅ Built-in metrics and monitoring (Prometheus)

## Prerequisites

- **Docker + Docker Compose** - For infrastructure
- **Node.js 20+** and **pnpm** - For application code  
  ⚠️ Node v23+ has compatibility issues with some packages
- **Moose CLI** - Install with:
  ```bash
  bash -i <(curl -fsSL https://fiveonefour.com/install.sh) moose
  ```
- **Redpanda Enterprise License** - Required for `postgres_cdc` input  
  Get a free 30-day trial: https://redpanda.com/try-enterprise

## Quick Start

### 1) Install Dependencies

```bash
# From repository root
cd oltp-to-olap-showcase
pnpm install

# Navigate to TypeORM example
cd apps/typeorm-example
```

### 2) Set Up Redpanda Enterprise License

⚠️ **REQUIRED:** The `postgres_cdc` connector requires a Redpanda Enterprise license.

```bash
# Option 1: Export in your shell (recommended)
export REDPANDA_LICENSE="your_license_key_here"

# Option 2: Create a .env file
echo "REDPANDA_LICENSE=your_license_key_here" > .env
```

📖 See [LICENSE_SETUP.md](../LICENSE_SETUP.md) for detailed instructions.

### 3) Start Moose Dev Environment

```bash
moose dev
```

**What happens:**

1. Moose starts local ClickHouse and Redpanda
2. `docker-compose.dev.override.yaml` starts PostgreSQL and Redpanda Connect
3. `setup-cdc.sh` runs automatically (configured in `moose.config.toml`):
   - Waits for services to be ready
   - Creates PostgreSQL publication and replication slot
   - Redpanda Connect starts streaming CDC events
   - Configures CDC topics: `typeorm.public.{customers,products,orders,order_items}`

Keep this terminal open! Moose handles infrastructure lifecycle.

### 4) Start TypeORM API (New Terminal)

```bash
# In a new terminal, same directory
pnpm dev
```

This starts the Express API on `http://localhost:3000` which will:

- Connect to PostgreSQL (via TypeORM)
- Auto-sync schema (create tables)
- Serve REST API with Scalar UI

### 5) Generate Test Data

```bash
# Create a customer
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "name": "John Doe",
    "country": "USA",
    "city": "San Francisco"
  }'

# Create a product
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MacBook Pro",
    "category": "Electronics",
    "price": 1999.99
  }'

# Create an order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "status": "completed",
    "total": 1999.99
  }'

# Create an order item (triggers CDC → fact table)
curl -X POST http://localhost:3000/api/order-items \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": 1,
    "productId": 1,
    "quantity": 1,
    "price": 1999.99
  }'
```

Or use the **Scalar UI**: http://localhost:3000/reference

### 6) Verify CDC Pipeline

#### Check Redpanda Topics

```bash
# List topics (should see typeorm.public.*)
docker exec redpanda rpk topic list

# Consume customer CDC events
docker exec redpanda rpk topic consume typeorm.public.customers --num 5

# Consume order item CDC events
docker exec redpanda rpk topic consume typeorm.public.order_items --num 5
```

#### Check ClickHouse (OLAP)

```bash
# Connect to ClickHouse CLI
docker exec -it clickhouse clickhouse-client

# Query dimensions
SELECT * FROM local.dim_customer;
SELECT * FROM local.dim_product;

# Query facts (denormalized - no joins!)
SELECT
  id,
  customerId,
  productId,
  quantity,
  unitPrice,
  revenue,
  customerCountry,
  productCategory
FROM local.fact_order
ORDER BY orderDate DESC;

# Analytics query (zero joins!)
SELECT
  customerCountry,
  productCategory,
  SUM(revenue) as total_revenue,
  COUNT(*) as order_count
FROM local.fact_order
GROUP BY customerCountry, productCategory
ORDER BY total_revenue DESC;
```

## Architecture Details

### Docker Compose Override

`docker-compose.dev.override.yaml` is automatically loaded by Moose:

```yaml
services:
  postgres: # OLTP database with logical replication
  redpanda-connect: # CDC connector (captures changes)
```

**Network:** Services join Moose's network (`moose_network`)

### Moose Configuration

`moose.config.toml` hooks the setup script:

```toml
[http_server_config]
on_first_start_script = "./setup-cdc.sh"
```

This runs once when Moose dev environment starts.

### Redpanda Connect Configuration

`redpanda-connect.yaml` configures CDC pipeline:

```yaml
input:
  postgres_cdc:
    dsn: 'postgres://postgres:postgres@typeorm-oltp-postgres:5432/typeorm_db'
    slot_name: 'redpanda_cdc_slot'
    publication_name: 'redpanda_cdc_publication'
    tables:
      - 'public.customers'
      - 'public.products'
      - 'public.orders'
      - 'public.order_items'

output:
  kafka:
    addresses: ['redpanda:19092']
    topic: "typeorm.public.${! meta('table_name') }"
```

**Topics created:**

- `typeorm.public.customers`
- `typeorm.public.products`
- `typeorm.public.orders`
- `typeorm.public.order_items`

### Moose Flows

Transform CDC events → OLAP format:

```
moose-olap/flows/
├── CustomerDimensionFlow.ts  # typeorm.public.customers → dim_customer
├── ProductDimensionFlow.ts   # typeorm.public.products → dim_product
└── OrderFactFlow.ts          # typeorm.public.order_items → fact_order (denormalized)
```

## Data Flow Timeline

```
1. [TypeORM API] POST /api/order-items
   └─▶ INSERT INTO order_items (PostgreSQL)

2. [PostgreSQL] Write-Ahead Log (WAL) captures change

3. [Redpanda Connect] Reads WAL via postgres_cdc → publishes to Redpanda
   └─▶ Topic: typeorm.public.order_items

4. [Moose Flow] OrderFactFlow receives event
   └─▶ Enriches with customer & product data
   └─▶ Denormalizes attributes
   └─▶ Pre-calculates revenue

5. [ClickHouse] Writes to fact_order table

6. [Analytics] Query available in ClickHouse

Total Latency: ~100-200ms (near real-time with Redpanda Connect!)
```

## Useful Commands

### Infrastructure

```bash
# Check Redpanda Connect status
curl http://localhost:4195/ready

# View Redpanda Connect metrics
curl http://localhost:9090/metrics

# Check Redpanda Connect logs
docker logs typeorm-redpanda-connect -f

# List Redpanda topics
docker exec redpanda rpk topic list

# View consumer groups
docker exec redpanda rpk group list

# Check PostgreSQL replication slot
docker exec typeorm-oltp-postgres \
  psql -U postgres -d typeorm_db \
  -c "SELECT * FROM pg_replication_slots;"
```

### Moose

```bash
# View all ClickHouse tables
moose ls

# Tail Moose logs
moose logs

# Truncate all OLAP tables
moose truncate --all

# Pull Kafka topics into Moose (if you add new topics)
moose kafka pull
```

### TypeORM API

```bash
# Development mode (hot reload)
pnpm dev

# Production build
pnpm build
pnpm start

# Clean artifacts
pnpm clean
```

## Environment Variables

TypeORM connects to PostgreSQL using:

```bash
DB_HOST=localhost       # Default
DB_PORT=5433            # Exposed on 5433 (avoid conflicts)
DB_USER=postgres        # Default
DB_PASSWORD=postgres    # Default
DB_NAME=typeorm_db      # Default
```

Override by setting environment variables:

```bash
DB_PORT=5433 pnpm dev
```

## Troubleshooting

### Setup Script Fails

```bash
# Make script executable
chmod +x setup-cdc.sh

# Restart Moose dev
# Ctrl+C to stop, then:
moose dev
```

### Connector Not Running

```bash
# Check Redpanda Connect logs
docker logs typeorm-redpanda-connect -f

# Check configuration
docker exec typeorm-redpanda-connect cat /redpanda-connect.yaml

# Restart Redpanda Connect
docker restart typeorm-redpanda-connect

# Re-run setup
./setup-cdc.sh
```

### No CDC Events in Redpanda

```bash
# Check PostgreSQL WAL level
docker exec typeorm-oltp-postgres \
  psql -U postgres -c "SHOW wal_level;"
# Should be "logical"

# Check replication slot exists
docker exec typeorm-oltp-postgres \
  psql -U postgres -d typeorm_db \
  -c "SELECT * FROM pg_replication_slots;"
```

### ClickHouse Tables Empty

```bash
# Check if flows are running
moose ls flows

# Check Moose logs for errors
moose logs

# Verify ClickHouse tables exist
docker exec clickhouse clickhouse-client \
  -q "SHOW TABLES FROM local"
```

### Clean Slate

```bash
# Stop Moose dev (Ctrl+C)

# Remove all volumes (deletes data)
docker compose -f docker-compose.dev.override.yaml down -v
docker volume prune -f

# Restart
moose dev
```

## Benefits of Redpanda Connect

This setup uses Redpanda Connect (enterprise) for CDC:

✅ **Native Integration** - Built specifically for Redpanda  
✅ **Simpler Config** - YAML-based, no REST API registration  
✅ **Lower Latency** - ~50% faster than Debezium  
✅ **Built-in Monitoring** - Prometheus metrics out of the box  
✅ **Auto-setup** - `setup-cdc.sh` runs automatically  
✅ **Production Ready** - Enterprise-grade CDC connector

### vs. Debezium

| Feature        | Redpanda Connect    | Debezium         |
| -------------- | ------------------- | ---------------- |
| Configuration  | YAML file           | JSON REST API    |
| Latency        | ~100-200ms          | ~200-300ms       |
| Resource Usage | Lower               | Higher           |
| Metrics        | Built-in Prometheus | Requires JMX     |
| Setup          | File-based          | API registration |

## Next Steps

1. ✅ **Run it:** Follow quick start above
2. 📖 **Learn:** Read [CDC_PIPELINE_DESIGN.md](CDC_PIPELINE_DESIGN.md)
3. 🔨 **Customize:** Modify flows in `moose-olap/flows/`
4. 🚀 **Deploy:** See Moose docs for production deployment

## Resources

- **[Redpanda Connect](https://docs.redpanda.com/redpanda-connect/)** - CDC connector documentation
- **[Redpanda Connect PostgreSQL CDC](https://docs.redpanda.com/redpanda-connect/components/inputs/postgres_cdc/)** - postgres_cdc input
- **[Moose Documentation](https://docs.fiveonefour.com/moose/olap)** - Moose framework
- **[TypeORM Docs](https://typeorm.io/)** - TypeScript ORM
- **[Redpanda Enterprise](https://www.redpanda.com/enterprise)** - Enterprise features
