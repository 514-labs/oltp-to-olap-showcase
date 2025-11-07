# Test Client - CDC Pipeline Interactive Tester

Interactive React UI for testing the OLTP-to-OLAP CDC pipeline. Create customers, products, and orders, then watch changes flow from PostgreSQL through Redpanda to ClickHouse in real-time.

## What It Does

- Generate realistic test data with one click
- Create complex orders with multiple items
- Update existing orders and track CDC events
- Delete records and verify pipeline handling
- Works with both TypeORM and SQLModel backends

## Prerequisites

**You need a backend running first.** Choose one:

### Option 1: TypeORM Backend (Port 3000)

```bash
cd apps/typeorm-example

# Terminal 1: Install deps and run setup (accept the prompt to run pnpm setup-db)
pnpm install
export REDPANDA_LICENSE="your_license_here"
./setup.sh

# Terminal 2: Start Moose (Redpanda Connect + ClickHouse sinks)
moose dev

# Terminal 3: Start API
pnpm dev
```

Verify: http://localhost:3000

### Option 2: SQLModel Backend (Port 3002)

```bash
cd apps/sqlmodel-example

# Terminal 1: Prepare virtualenv, install deps, run setup
python -m venv venv
source venv/bin/activate
pip install -e .
export REDPANDA_LICENSE="your_license_here"
./setup.sh

# Terminal 2: Start Moose (Redpanda Connect + ClickHouse sinks)
moose dev

# Terminal 3: Start API (run python init_db.py if you skipped it)
source venv/bin/activate
# python init_db.py
fastapi dev src/main.py --port 3002
```

Verify: http://localhost:3002/docs

## Installation

```bash
cd apps/test-client
pnpm install

# Configure which backend to connect to (optional)
cp .env.example .env
# Edit .env and set VITE_API_URL to your backend's URL

pnpm dev
```

Visit http://localhost:3001

### Backend Configuration

The test client can connect to any backend API. You have three ways to configure it:

**Option 1: In-App Settings (Easiest)** ⭐
1. Click the **Settings** button in the top-right corner
2. Select a preset backend (TypeORM, SQLModel, etc.) or enter a custom URL
3. Click **Save & Reconnect**

The app will automatically reconnect and reload data. Settings are saved in your browser.

**Option 2: Using .env file**
```bash
# Copy example and edit
cp .env.example .env

# For TypeORM backend
echo "VITE_API_URL=http://localhost:3000" > .env

# For SQLModel backend
echo "VITE_API_URL=http://localhost:3002" > .env

# Optional: Configure custom ports for Settings modal presets
echo "VITE_TYPEORM_PORT=8080" >> .env
# This makes the TypeORM preset in Settings show port 8080
```

**Option 3: Inline with dev command**
```bash
# TypeORM backend
VITE_API_URL=http://localhost:3000 pnpm dev

# SQLModel backend
VITE_API_URL=http://localhost:3002 pnpm dev
```

**Default:** If not configured, defaults to `http://localhost:3002` (SQLModel backend)

### Auto-Detection of Connection Issues

If the test client can't connect to the backend, it will automatically show the settings modal. This happens when:
- The backend server is not running
- The wrong port is configured
- CORS issues prevent the connection

Just click "Save & Reconnect" to retry with the correct URL.

## Using the Test Client

### 1. Generate Seed Data

**Create Customers:**
Click "Generate Random Customer" to create test customers (5-10 recommended).

**Create Products:**
Click "Generate Random Product" to create test products (10-15 recommended).

### 2. Create Orders

Click "Generate Random Order" to create an order with:
- Random customer
- 1-5 order items
- Random products and quantities
- Calculated totals

Each order triggers multiple CDC events:
- 1 INSERT into `orders` table
- Multiple INSERTs into `order_items` table
- All changes streamed to ClickHouse within milliseconds

### 3. Edit Orders

Click the edit icon to modify:
- Customer assignment
- Order status (pending, confirmed, shipped, delivered, cancelled)
- Total amount

Watch UPDATE CDC events flow through the pipeline.

### 4. Delete Orders

Click the trash icon to delete orders.

Tests DELETE operations and soft-delete patterns in the CDC pipeline.

## Verifying the CDC Pipeline

### Check ClickHouse Data

```bash
# Connect to ClickHouse
docker exec -it moose-clickhouse clickhouse-client -u panda --password pandapass

# View customers
SELECT * FROM local.customer_dim LIMIT 10;

# View orders (denormalized with customer data)
SELECT * FROM local.order_fact LIMIT 10;

# Check recent changes
SELECT order_id, customer_name, status, total, is_deleted
FROM local.order_fact
ORDER BY lsn DESC
LIMIT 10;
```

### Run Analytics Queries

```sql
-- Revenue by country
SELECT
  customer_country,
  COUNT(DISTINCT order_id) as order_count,
  SUM(total) as total_revenue
FROM local.order_fact
WHERE is_deleted = 0
GROUP BY customer_country
ORDER BY total_revenue DESC;

-- Orders by status
SELECT
  status,
  COUNT(*) as count,
  AVG(total) as avg_order_value
FROM local.order_fact
WHERE is_deleted = 0
GROUP BY status;
```

Notice how queries run instantly without JOINs - this is the power of denormalization.

## Expected Latency

From button click to ClickHouse:

- PostgreSQL write: <10ms
- CDC capture: 50-100ms
- Redpanda streaming: <50ms
- Moose transformation: 10-50ms
- ClickHouse insert: 50-100ms

**Total: 200-300ms typically, under 1 second worst case**

This is real-time analytics - not instantaneous, but fast enough for live dashboards.

## Troubleshooting

### "Cannot connect to API"

The settings modal should appear automatically when there's a connection error. If not:

**1. Open Settings manually:**
Click the "Settings" button in the top-right corner and verify the API URL is correct.

**2. Verify backend is running on the correct port:**
```bash
# TypeORM (default port 3000)
curl http://localhost:3000/health

# SQLModel (default port 3002)
curl http://localhost:3002/health
```

**3. Check the browser console:**
Look for messages like `[API] Initialized with URL: http://localhost:3002` to see which URL is being used.

**4. Clear browser storage if needed:**
```javascript
// In browser console
localStorage.removeItem('test_client_api_url')
// Then refresh the page
```

**5. Check PostgreSQL is running:**
```bash
docker ps | grep postgres
```

### Data in PostgreSQL but not ClickHouse

**Check Moose is running:**
Look for Moose dev server output with no errors.

**Check CDC connector:**
```bash
curl http://localhost:4195/ready
```

**Check ClickHouse is running:**
```bash
docker ps | grep clickhouse
```

**Review logs:**
Check Moose console and Redpanda Connect logs for errors.

### Slow Data Propagation

- Check Docker resource allocation
- Verify no heavy load on ClickHouse
- Review Moose transformation performance
- Check network latency between containers

## Architecture Context

```
Test Client (React)
       ↓ HTTP
Express/FastAPI (OLTP API)
       ↓ SQL
PostgreSQL (Transactions)
       ↓ WAL
Redpanda Connect (CDC)
       ↓ Kafka
Redpanda (Streaming)
       ↓ Topics
Moose (Transformations)
       ↓ SQL
ClickHouse (Analytics)
```

Every button click cascades through this entire pipeline.

## Technology Stack

- React 18 + TypeScript
- Vite (dev server & build tool)
- shadcn/ui components
- Tailwind CSS
- React Query for data fetching

## Building for Production

```bash
# Build optimized assets
pnpm build

# Preview build
pnpm preview
```

Built files output to `dist/` directory.

**Note:** This is a development/testing tool. For production analytics dashboards, query ClickHouse directly rather than using the OLTP API.

## Next Steps

### Explore the Architecture

- [Main README](../../README.md) - Project overview
- [TypeORM Example](../typeorm-example/README.md) - TypeScript implementation
- [SQLModel Example](../sqlmodel-example/README.md) - Python implementation
- [CDC Transformation Architecture](../sqlmodel-example/docs/CDC_TRANSFORMATION_ARCHITECTURE.md) - Stream routing deep dive

### Extend the Client

This is a learning tool - modify it:
- Add new entity types
- Create custom test scenarios
- Build analytics visualizations
- Display pipeline latency metrics
- Add filters and search

## Contributing

Found a bug or have an idea? Open an issue or pull request!

---

**Questions?** Check the [main documentation](../../README.md) or refer to the specific backend guides.
