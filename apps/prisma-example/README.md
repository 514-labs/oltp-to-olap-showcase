# Prisma CDC Example

**Real-time PostgreSQL CDC → Moose → ClickHouse with Prisma**

Transform Prisma models into denormalized OLAP tables with real-time CDC replication using Express.js.

> **Status:** Work in Progress - Implementation in progress

## What This Will Do

- Prisma schema-first development with type-safe client
- Real-time CDC using Redpanda Connect
- Denormalized star schema for fast analytics
- Express API with OpenAPI docs
- Automatic type generation from Prisma schema
- Compatible with the React test client

**Architecture:** PostgreSQL → Redpanda Connect → Redpanda → Moose → ClickHouse

## Quick Start (When Complete)

### Prerequisites

- Node.js 18+ and pnpm installed
- Docker and Docker Compose installed
- Redpanda Enterprise License - [Get free 30-day trial](https://redpanda.com/try-enterprise)

### Installation

```bash
# Navigate to the example
cd apps/prisma-example

# Install dependencies
pnpm install
```

### Running the Application

**Step 1: Set Redpanda License**

```bash
export REDPANDA_LICENSE="your_license_key_here"
```

**Step 2: Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your database credentials if needed
```

**Step 3: Start Infrastructure**

```bash
# Terminal 1: Start Moose (keeps running)
moose dev
```

**Expected Output:**
```
🟢 Moose is running
⏳ Waiting for tables to be created by Prisma...
```

**What this does:** Starts the complete CDC infrastructure (Redpanda, ClickHouse, Moose flows). Moose will wait for PostgreSQL tables to be created before starting the CDC connector.

**Step 4: Start OLTP Application**

```bash
# Terminal 2: Start PostgreSQL and API
pnpm start-oltp  # Starts PostgreSQL
```

**Expected Output:**
```
════════════════════════════════════════════════════════════
  Starting OLTP Application (Prisma + PostgreSQL)
════════════════════════════════════════════════════════════

📦 Step 1: Starting PostgreSQL...
✅ PostgreSQL is ready

📋 Step 2: Pushing Prisma schema to database...
✅ Database schema created

════════════════════════════════════════════════════════════
  ✅ OLTP Application Ready
════════════════════════════════════════════════════════════
```

**Step 5: Generate Prisma Client and start API**

```bash
# Generate Prisma Client (first time only)
pnpm prisma:generate

# Start API server
pnpm dev
```

**Expected Output:**
```
> prisma-example@1.0.0 dev
> tsx watch src/index.ts

🚀 Prisma Express API listening on port 3003
📖 API documentation: http://localhost:3003/reference
```

**What this does:**

1. **start-oltp**: Starts PostgreSQL with logical replication enabled
2. **prisma:generate**: Generates type-safe Prisma Client from schema
3. **dev**: Starts Express API server, triggers CDC setup through Moose hooks
4. CDC setup automatically creates PostgreSQL publication and replication slot
5. Redpanda Connect begins streaming changes to ClickHouse

**Check CDC is running:** Terminal 1 (Moose) should now show:
```
✅ CDC connector started successfully
🔄 Streaming changes from PostgreSQL to ClickHouse
```

### Verify the CDC Pipeline

**Step 1: Check all services are healthy**

```bash
# PostgreSQL health
docker exec -it prisma-postgres pg_isready

# API health
curl http://localhost:3003/health

# Redpanda Connect health
curl http://localhost:4197/ready

# Expected: {"status": "ok"}
```

**Step 2: View API documentation**

Visit http://localhost:3003/reference for interactive API documentation (Scalar UI)

**Step 3: Create test data**

```bash
# Create a customer
curl -X POST http://localhost:3003/api/customers \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User", "country": "USA", "city": "NYC"}'

# Expected response:
# {"id": 1, "email": "test@example.com", "name": "Test User", "country": "USA", "city": "NYC"}

# Create a product
curl -X POST http://localhost:3003/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Laptop", "category": "Electronics", "price": 999.99}'

# Expected response:
# {"id": 1, "name": "Laptop", "category": "Electronics", "price": 999.99}

# Create an order
curl -X POST http://localhost:3003/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId": 1, "status": "pending", "total": 999.99}'

# Expected response:
# {"id": 1, "customerId": 1, "status": "pending", "total": 999.99, ...}
```

**Step 4: Verify data in PostgreSQL (source)**

```bash
# Connect to PostgreSQL
docker exec -it prisma-postgres psql -U postgres -d prisma_db

# Query data
SELECT * FROM "Customer";
SELECT * FROM "Product";
SELECT * FROM "Order";

# Exit PostgreSQL
\q
```

**Expected Output:**
```
 id |       email       |   name    | country | city
----+-------------------+-----------+---------+------
  1 | test@example.com | Test User | USA     | NYC
```

**Step 5: Check CDC publication and slot**

```bash
docker exec -it prisma-postgres psql -U postgres -d prisma_db -c "SELECT * FROM pg_publication;"
```

**Expected Output:**
```
         pubname          | pubowner | puballtables | pubinsert | pubupdate | pubdelete
--------------------------+----------+--------------+-----------+-----------+-----------
 redpanda_cdc_publication |       10 | f            | t         | t         | t
```

```bash
docker exec -it prisma-postgres psql -U postgres -d prisma_db -c "SELECT slot_name, plugin, active FROM pg_replication_slots;"
```

**Expected Output:**
```
      slot_name       |  plugin  | active
----------------------+----------+--------
 redpanda_cdc_slot    | pgoutput | t
```

**Step 6: Verify data in ClickHouse (destination)**

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

**Step 7: Verify real-time CDC is working**

```bash
# Update a customer
curl -X PUT http://localhost:3003/api/customers/1 \
  -H "Content-Type: application/json" \
  -d '{"city": "San Francisco"}'

# Wait 2-3 seconds for CDC to process

# Query ClickHouse again
docker exec -it moose-clickhouse clickhouse-client -u panda --password pandapass \
  -q "SELECT customer_id, customer_name, city, lsn FROM local.customer_dim WHERE customer_id = 1 ORDER BY lsn DESC LIMIT 5;"
```

**Expected:** You should see the updated city value, demonstrating real-time CDC!

### Test with Interactive UI (Optional)

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

## Features

- Schema-first development with `schema.prisma`
- Type-safe Prisma Client with auto-completion
- Relation queries with `include`
- PostgreSQL integration with logical replication
- RESTful API with Express.js
- Interactive API documentation (Scalar)
- CDC pipeline ready with Moose and ClickHouse

## Project Structure

```
prisma-example/
├── src/
│   ├── index.ts            # Express API server
│   ├── openapi.ts          # OpenAPI specification
│   └── routes/             # API route handlers
│
├── prisma/
│   └── schema.prisma       # Prisma database schema
│
├── app/
│   ├── index.ts            # Moose OLAP table definitions
│   └── streams/            # (Auto-generated streaming functions)
│
├── docker-compose.oltp.yaml           # PostgreSQL service
├── docker-compose.dev.override.yaml   # CDC services (when complete)
├── moose.config.toml                  # Moose settings
│
├── start-oltp.sh           # Start OLTP (PostgreSQL + setup)
└── .env.example            # Environment variables template
```

## Database Schema

The Prisma schema includes:

- **Customer** - Customer information with addresses
- **Product** - Product catalog
- **Order** - Order records with customer relationship
- **OrderItem** - Order line items linking orders and products
- **CustomerAddress** - Customer addresses (one-to-many)

**Example Prisma Schema:**

```prisma
model Customer {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  name      String
  country   String
  city      String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  orders    Order[]
  addresses CustomerAddress[]
}

model Product {
  id          Int         @id @default(autoincrement())
  name        String
  category    String
  price       Decimal     @db.Decimal(10, 2)
  createdAt   DateTime    @default(now())

  orderItems  OrderItem[]
}

model Order {
  id         Int         @id @default(autoincrement())
  customerId Int
  status     String      @default("pending")
  total      Decimal     @db.Decimal(10, 2)
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt

  customer   Customer    @relation(fields: [customerId], references: [id])
  items      OrderItem[]
}

model OrderItem {
  id        Int      @id @default(autoincrement())
  orderId   Int
  productId Int
  quantity  Int
  price     Decimal  @db.Decimal(10, 2)

  order     Order    @relation(fields: [orderId], references: [id])
  product   Product  @relation(fields: [productId], references: [id])
}
```

## API Endpoints

**Customers:**

- `POST /api/customers` - Create customer
- `GET /api/customers` - List all customers
- `GET /api/customers/:id` - Get customer by ID
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

**Products:**

- `POST /api/products` - Create product
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product by ID
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

**Orders:**

- `POST /api/orders` - Create order
- `GET /api/orders` - List all orders
- `GET /api/orders/:id` - Get order by ID
- `PATCH /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

**Order Items:**

- `POST /api/order-items` - Create order item
- `GET /api/order-items` - List all order items

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm start-oltp` - Start PostgreSQL
- `pnpm stop-oltp` - Stop PostgreSQL
- `pnpm prisma:generate` - Generate Prisma Client
- `pnpm prisma:push` - Push schema to database (development)
- `pnpm prisma:migrate` - Run migrations (production)
- `pnpm prisma:studio` - Open Prisma Studio (database GUI)

## Troubleshooting

### PostgreSQL Won't Start

**Symptom:** `start-oltp.sh` fails or PostgreSQL container exits

**Diagnostic:**
```bash
# Check if container is running
docker ps | grep prisma-postgres

# Check container logs
docker logs prisma-postgres
```

**Solutions:**

1. **Port conflict** - Another service using port 5435
   ```bash
   # Check what's using the port
   lsof -i :5435

   # Stop conflicting service or change port in docker-compose.oltp.yaml
   ```

2. **Docker daemon not running**
   ```bash
   # Start Docker Desktop or Docker daemon
   ```

### "Waiting for tables" Persists in Moose

**Symptom:** Moose shows "Waiting for tables to be created by Prisma..." indefinitely

**Cause:** Prisma hasn't created tables yet, or `POSTGRES_CDC_WAIT_FOR_TABLE` references wrong table

**Solutions:**

1. **Push Prisma schema** to create tables
   ```bash
   pnpm prisma:push
   # or
   pnpm prisma:migrate dev
   ```

2. **Check table name is correct**
   ```bash
   docker exec -it prisma-postgres psql -U postgres -d prisma_db -c "\dt"
   # Verify "Customer" table exists (PascalCase by default in Prisma)
   ```

3. **Verify table naming convention**
   Prisma uses **PascalCase** table names by default: `Customer`, `Product`, `Order`, `OrderItem`

### Redpanda Connect Won't Start

**Symptom:** `redpanda-connect` container keeps restarting

**Diagnostic:**
```bash
# Check logs
docker logs prisma-redpanda-connect

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

2. **CDC setup failed**
   ```
   Error: publication "redpanda_cdc_publication" does not exist
   ```
   Solution: Check cdc-setup container completed successfully
   ```bash
   docker logs prisma-cdc-setup
   # Should show "✅ CDC primitives ready"
   ```

3. **Wrong connection string**
   ```
   Error: failed to connect to PostgreSQL
   ```
   Solution: Verify DSN includes `?sslmode=disable`
   ```bash
   # In docker-compose.dev.override.yaml
   POSTGRES_CDC_DSN: postgres://postgres:postgres@prisma-postgres:5432/prisma_db?sslmode=disable
   ```

### Table Name Mismatches

**Symptom:** CDC connector errors mentioning table names

**Solution:** Ensure table names in all configs match exactly:

Prisma uses **PascalCase** table names by default: `Customer`, `Product`, `Order`, `OrderItem`

**Check these files:**
1. `docker-compose.dev.override.yaml`:
   ```yaml
   POSTGRES_CDC_TABLES: Customer,Product,Order,OrderItem
   POSTGRES_CDC_TABLES_JSON: ["Customer","Product","Order","OrderItem"]
   POSTGRES_CDC_WAIT_FOR_TABLE: Customer
   ```

2. Prisma schema:
   ```prisma
   model Customer {  // Table name: "Customer"
     ...
   }
   ```

**Override table names in Prisma:**
```prisma
model Customer {
  @@map("customers")  // Use lowercase plural table name
}
```

### Prisma Client Not Found

**Symptom:** Import errors or "Cannot find module '@prisma/client'"

**Solution:**
```bash
# Generate Prisma Client
pnpm prisma:generate

# Verify it was generated
ls -la node_modules/.prisma/client
```

### Database Schema Out of Sync

**Symptom:** Prisma warns schema is out of sync with database

**Solution:**
```bash
# Development: push changes
pnpm prisma:push

# Production: use migrations
pnpm prisma:migrate dev --name your_migration_name
```

### Reset Everything

**When all else fails, complete reset:**

```bash
# Stop all services
docker compose -f ../../packages/shared/cdc/docker-compose.postgres.yaml \
  -f docker-compose.oltp.yaml \
  -f docker-compose.dev.override.yaml down -v

# Remove volumes (WARNING: destroys all data)
docker volume rm prisma-example_postgres-data

# Restart from scratch
export REDPANDA_LICENSE="your_license_key"
moose dev          # Terminal 1
pnpm start-oltp    # Terminal 2
pnpm prisma:generate && pnpm dev  # Terminal 2 (after start-oltp completes)
```

### Check Shared CDC Configuration

For detailed information about the CDC infrastructure and environment variables:

**See:** [Shared CDC Documentation](../../packages/shared/cdc/README.md)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5435/prisma_db` | PostgreSQL connection |
| `PORT` | `3003` | API server port |
| `NODE_ENV` | `development` | Environment mode |

## Documentation

- [Shared CDC Infrastructure](../../packages/shared/cdc/README.md) - CDC template system
- [Main README](../../README.md) - Project overview
- [Prisma Documentation](https://www.prisma.io/docs) - Official Prisma docs

## Technology Stack

- **OLTP:** PostgreSQL 15 + Prisma 5
- **CDC:** Redpanda Connect (Enterprise) + PostgreSQL CDC connector
- **Streaming:** Redpanda (Kafka-compatible)
- **OLAP:** Moose 0.6 + ClickHouse
- **API:** Express + Scalar OpenAPI docs
- **Language:** TypeScript 5

## Prisma vs TypeORM

| Feature | Prisma | TypeORM |
|---------|--------|---------|
| Schema Definition | Declarative (schema.prisma) | Decorators (@Entity, @Column) |
| Type Safety | Excellent (generated client) | Good (decorators) |
| Migrations | Built-in (prisma migrate) | Built-in (typeorm migration) |
| Query Builder | Type-safe | Type-safe |
| Table Names | PascalCase default | plural lowercase default |
| Learning Curve | Easier | Moderate |
| Database First | Supported (prisma db pull) | Supported (synchronize) |

## Learn More

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Moose Documentation](https://docs.fiveonefour.com/moose/)
- [PostgreSQL Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)

---

**Related Examples:**
- [TypeORM Example](../typeorm-example/README.md) - TypeScript/Node.js (Production Ready)
- [SQLModel Example](../sqlmodel-example/README.md) - Python/FastAPI (Production Ready)

**Need help?** Check the **[Shared CDC Documentation](../../packages/shared/cdc/README.md)** or open an issue.
