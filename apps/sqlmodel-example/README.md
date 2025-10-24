# SQLModel CDC Example

**Real-time PostgreSQL CDC → Moose → ClickHouse with Python**

Transform SQLModel models into denormalized OLAP tables with real-time CDC replication using FastAPI.

> **What is SQLModel?** A modern Python library that combines SQLAlchemy (database) and Pydantic (validation) into a single, type-safe model definition. Created by Sebastián Ramírez (FastAPI's creator), it's designed specifically for FastAPI applications. See [Why SQLModel?](docs/WHY_SQLMODEL.md) for a detailed explanation.

## What This Does

- **SQLModel** models providing database + API validation in one
- Real-time CDC using Redpanda Connect
- Denormalized star schema for fast analytics
- FastAPI with auto-generated OpenAPI docs
- Type-safe API with automatic Pydantic validation
- Single source of truth: one model = DB table + API schema
- Compatible with the React test client

**Architecture:** PostgreSQL → Redpanda Connect → Redpanda → Moose → ClickHouse

## Quick Start

### Prerequisites

- Python 3.12 or higher
- Docker and Docker Compose installed
- Redpanda Enterprise License - [Get free 30-day trial](https://redpanda.com/try-enterprise)

### Installation

```bash
# Navigate to the example
cd apps/sqlmodel-example

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -e .
```

### Running the Application

**Step 1: Set Redpanda License**

```bash
export REDPANDA_LICENSE="your_license_key_here"
```

**Step 2: Start PostgreSQL**

```bash
# Terminal 1
./start-oltp.sh
```

**Expected Output:**
```
════════════════════════════════════════════════════════════
  Starting OLTP Application (SQLModel + PostgreSQL)
════════════════════════════════════════════════════════════

📦 Step 1: Starting PostgreSQL...
✅ PostgreSQL is ready

════════════════════════════════════════════════════════════
  ✅ OLTP Application Started Successfully!
════════════════════════════════════════════════════════════

PostgreSQL container: sqlmodel-postgres
Host port: 5434
Database: sqlmodel_db
```

**What this does:** Starts PostgreSQL with logical replication enabled (wal_level=logical) for CDC.

**Step 3: Start Moose (CDC infrastructure)**

```bash
# Terminal 2
moose dev
```

**Expected Output:**
```
🟢 Moose is running
⏳ Waiting for tables to be created...
```

**What this does:** Starts the complete CDC stack:
- Redpanda (Kafka-compatible message broker)
- Redpanda Connect (PostgreSQL CDC connector)
- ClickHouse (OLAP database)
- Moose streaming functions

**Step 4: Initialize database and start API**

```bash
# Terminal 3: Initialize database (first time only)
python init_db.py
```

**Expected Output:**
```
Creating all tables...
✅ Tables created successfully!
```

```bash
# Start FastAPI server
fastapi dev src/main.py --port 3002
```

**Expected Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:3002
INFO:     Application startup complete
```

**What this does:**
1. **init_db.py**: Creates SQLModel tables in PostgreSQL
2. **fastapi dev**: Starts the FastAPI API server, which triggers CDC setup
3. CDC setup automatically creates publication and replication slot
4. Redpanda Connect begins streaming changes to ClickHouse

**Check CDC is running:** Terminal 2 (Moose) should now show:
```
✅ CDC connector started successfully
🔄 Streaming changes from PostgreSQL to ClickHouse
```

### Verify the CDC Pipeline

**Step 1: Check all services are healthy**

```bash
# PostgreSQL health
docker exec -it sqlmodel-postgres pg_isready

# API health
curl http://localhost:3002/health

# Redpanda Connect health
curl http://localhost:4196/ready

# Expected: {"status": "ok"}
```

**Step 2: View API documentation**

- **Swagger UI**: http://localhost:3002/docs (interactive API testing)
- **ReDoc**: http://localhost:3002/redoc (clean documentation view)

**Step 3: Create test data**

```bash
# Create a customer
curl -X POST http://localhost:3002/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "name": "Jane Doe",
    "country": "USA",
    "city": "San Francisco"
  }'

# Expected response:
# {"id": 1, "email": "jane@example.com", "name": "Jane Doe", "country": "USA", "city": "San Francisco"}

# Create a product
curl -X POST http://localhost:3002/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Mouse",
    "category": "Electronics",
    "price": "29.99"
  }'

# Expected response:
# {"id": 1, "name": "Wireless Mouse", "category": "Electronics", "price": 29.99}

# Create an order
curl -X POST http://localhost:3002/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "status": "pending",
    "total": "29.99"
  }'

# Expected response:
# {"id": 1, "customerId": 1, "status": "pending", "total": 29.99, ...}
```

**Step 4: Verify data in PostgreSQL (source)**

```bash
# Connect to PostgreSQL
docker exec -it sqlmodel-postgres psql -U postgres -d sqlmodel_db

# Query data
SELECT * FROM customer;
SELECT * FROM product;
SELECT * FROM "order";

# Exit PostgreSQL
\q
```

**Expected Output:**
```
 id |      email       |   name   | country |      city
----+------------------+----------+---------+----------------
  1 | jane@example.com | Jane Doe | USA     | San Francisco
```

**Step 5: Check CDC publication and slot**

```bash
docker exec -it sqlmodel-postgres psql -U postgres -d sqlmodel_db -c "SELECT * FROM pg_publication;"
```

**Expected Output:**
```
         pubname          | pubowner | puballtables | pubinsert | pubupdate | pubdelete
--------------------------+----------+--------------+-----------+-----------+-----------
 redpanda_cdc_publication |       10 | f            | t         | t         | t
```

```bash
docker exec -it sqlmodel-postgres psql -U postgres -d sqlmodel_db -c "SELECT slot_name, plugin, active FROM pg_replication_slots;"
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
┌─customer_id─┬─customer_name─┬─customer_email───┬─country─┬─city───────────┬─is_deleted─┬──────────lsn─┐
│           1 │ Jane Doe      │ jane@example.com │ USA     │ San Francisco  │          0 │ 0/1A2B3C4    │
└─────────────┴───────────────┴──────────────────┴─────────┴────────────────┴────────────┴──────────────┘
```

**Step 7: Verify real-time CDC is working**

```bash
# Update a customer
curl -X PATCH http://localhost:3002/api/customers/1 \
  -H "Content-Type: application/json" \
  -d '{"city": "Los Angeles"}'

# Wait 2-3 seconds for CDC to process

# Query ClickHouse again
docker exec -it moose-clickhouse clickhouse-client -u panda --password pandapass \
  -q "SELECT customer_id, customer_name, city, lsn FROM local.customer_dim WHERE customer_id = 1 ORDER BY lsn DESC LIMIT 5;"
```

**Expected:** You should see the updated city value, demonstrating real-time CDC!

### Test with Interactive UI (Optional)

```bash
# Terminal 4: Start test client
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

## Project Structure

```
sqlmodel-example/
├── src/
│   ├── db/
│   │   ├── base.py          # Database session and config
│   │   ├── customer.py      # Customer model
│   │   ├── product.py       # Product model
│   │   ├── order.py         # Order model
│   │   └── order_item.py    # OrderItem model
│   ├── schemas.py           # Pydantic request/response models
│   └── main.py              # FastAPI application
│
├── app/
│   └── index.ts             # Moose OLAP table definitions
│
├── init_db.py               # Database initialization script
├── requirements.txt         # Python dependencies
├── setup.py                 # Package setup
│
├── docker-compose.oltp.yaml # PostgreSQL service
├── moose.config.toml        # Moose configuration
└── README.md
```

## How It Works

### SQLModel Models (OLTP)

Normalized relational models for transactional data using **SQLModel's unified approach**:

```python
# src/db/models.py
from sqlmodel import SQLModel, Field, Relationship

class OrderBase(SQLModel):
    customerId: int = Field(foreign_key="customer.id", index=True)
    total: Decimal = Field(gt=0, decimal_places=2)

class Order(OrderBase, table=True):
    """One model serves as both database table AND API schema"""
    id: int | None = Field(default=None, primary_key=True)
    status: str = Field(default="pending", max_length=50)

    # Relationships work like SQLAlchemy
    customer: Customer | None = Relationship(back_populates="orders")
    items: list["OrderItem"] = Relationship(back_populates="order")

class OrderInsert(OrderBase):
    """For API requests (no id needed)"""
    pass
```

**Key benefit:** This single model definition provides:

- Database table structure (via SQLAlchemy 2.0)
- Automatic Pydantic validation
- JSON serialization for FastAPI responses
- Full type safety with editor support

### CDC Event Flow

```
SQLModel          PostgreSQL        Redpanda         Moose           ClickHouse
  Insert   ────>    WAL     ────>   Connect   ────>  Flow   ────>    Table
  Order            Capture          Stream           Transform        Insert
```

**How SQLModel integrates:**

1. SQLModel defines the database schema (via SQLAlchemy 2.0)
2. FastAPI endpoints validate requests (via Pydantic)
3. Data is inserted into PostgreSQL
4. PostgreSQL WAL captures changes
5. Changes stream through Redpanda to ClickHouse

### Moose OLAP Tables

Denormalized tables optimized for analytics:

```typescript
// app/index.ts
export interface OrderFact {
  order_id: UInt64;
  customer_id: UInt64;
  customer_name: string; // Denormalized from customer
  customer_email: string; // Denormalized from customer
  status: string;
  total: Float64;
  order_date: DateTime;
}
```

## SQLModel: One Model, Multiple Uses

SQLModel revolutionizes Python database development by **combining SQLAlchemy and Pydantic into a single model definition**.

### Traditional Approach (SQLAlchemy + Pydantic)

```python
# models.py - Database definition
class Customer(Base):
    __tablename__ = "customer"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
    name = Column(String)

# schemas.py - API validation
class CustomerCreate(BaseModel):
    email: str
    name: str

class CustomerResponse(BaseModel):
    id: int
    email: str
    name: str
    class Config:
        from_attributes = True

# main.py - Manual conversion
@app.post("/customers")
def create(customer: CustomerCreate, db: Session):
    db_customer = Customer(**customer.dict())  # Convert manually
    db.add(db_customer)
    db.commit()
    return db_customer
```

**Total: ~30 lines, 3 separate definitions**

### SQLModel Approach (Single Definition)

```python
# models.py - Everything in one place
class CustomerBase(SQLModel):
    email: str = Field(unique=True)
    name: str

class Customer(CustomerBase, table=True):
    id: int | None = Field(default=None, primary_key=True)

class CustomerInsert(CustomerBase):
    pass

# main.py - Direct usage
@app.post("/customers", response_model=Customer)
def create(customer: CustomerInsert, db: Session):
    db_customer = Customer(**customer.model_dump())
    db.add(db_customer)
    db.commit()
    return db_customer  # Auto-serializes to JSON
```

**Total: ~15 lines, single source of truth**

**Result:** 50% less code, automatic validation, zero manual conversions.

## Key Features

### Why SQLModel?

**Single Source of Truth**

- One model definition = database table + API schema
- No need for separate SQLAlchemy and Pydantic models
- Reduces code by 40-60% compared to traditional approach
- Less duplication = fewer bugs

**Automatic Validation**

- Pydantic validation built into every model
- Field-level constraints (min/max length, numeric ranges, regex patterns)
- FastAPI automatically returns 422 with detailed validation errors
- No manual validation code needed

**Type Safety**

- Full type hints throughout the stack
- Editor autocomplete and type checking
- Catch errors before runtime with mypy
- Modern Python 3.10+ union types (`int | None`)

**Developer Experience**

- Less boilerplate code
- Automatic OpenAPI/Swagger documentation
- JSON serialization built-in
- Designed specifically for FastAPI by FastAPI's creator

**Built on Proven Tech**

- SQLAlchemy 2.0 for database operations
- Pydantic v2 for validation (Rust-powered, super fast)
- Full access to SQLAlchemy features when needed
- Compatible with all SQLAlchemy extensions

**CDC Ready**

- Table names match CDC connector expectations: `customer`, `product`, `order`, `orderitem` (singular, no underscores)
- Standard PostgreSQL logical replication
- Works seamlessly with Redpanda Connect
- No special CDC configuration needed

## API Endpoints

**Customers:**

- `POST /api/customers` - Create customer
- `GET /api/customers` - List all customers
- `GET /api/customers/{id}` - Get customer by ID

**Products:**

- `POST /api/products` - Create product
- `GET /api/products` - List all products
- `GET /api/products/{id}` - Get product by ID

**Orders:**

- `POST /api/orders` - Create order
- `GET /api/orders` - List all orders
- `GET /api/orders/{id}` - Get order by ID
- `PATCH /api/orders/{id}` - Update order
- `DELETE /api/orders/{id}` - Delete order

**Order Items:**

- `POST /api/order-items` - Create order item
- `GET /api/order-items` - List all order items

All endpoints return camelCase JSON for frontend compatibility.

## Database Management

### Manual Initialization

```bash
# Create tables
python init_db.py

# Drop and recreate tables (WARNING: deletes all data)
python init_db.py --drop
```

### Auto-Initialization (Development Only)

```bash
# Enable auto-init for development
AUTO_INIT_DB=true fastapi dev src/main.py --port 3002
```

Not recommended for production - use migrations instead.

## Troubleshooting

### PostgreSQL Won't Start

**Symptom:** `start-oltp.sh` fails or PostgreSQL container exits

**Diagnostic:**
```bash
# Check if container is running
docker ps | grep sqlmodel-postgres

# Check container logs
docker logs sqlmodel-postgres
```

**Solutions:**

1. **Port conflict** - Another service using port 5434
   ```bash
   # Check what's using the port
   lsof -i :5434

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

**Symptom:** Moose shows "Waiting for tables to be created..." indefinitely

**Cause:** SQLModel hasn't created tables yet, or `POSTGRES_CDC_WAIT_FOR_TABLE` references wrong table

**Solutions:**

1. **Run init_db.py** to create tables
   ```bash
   python init_db.py
   ```

2. **Check table name is correct**
   ```bash
   docker exec -it sqlmodel-postgres psql -U postgres -d sqlmodel_db -c "\dt"
   # Verify "customer" table exists (not "customers")
   ```

3. **Verify table naming convention**
   SQLModel uses **singular** table names by default: `customer`, `product`, `order`, `orderitem`

### Redpanda Connect Won't Start

**Symptom:** `redpanda-connect` container keeps restarting

**Diagnostic:**
```bash
# Check logs
docker logs sqlmodel-redpanda-connect

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
   docker logs sqlmodel-cdc-setup
   # Should show "✅ CDC primitives ready"
   ```

4. **Wrong connection string (SSL error)**
   ```
   Error: failed to connect to PostgreSQL
   ```
   Solution: Verify DSN includes `?sslmode=disable`
   ```bash
   # In docker-compose.dev.override.yaml
   POSTGRES_CDC_DSN: postgresql://postgres:postgres@sqlmodel-postgres:5432/sqlmodel_db?sslmode=disable
   ```

### No Data Appearing in ClickHouse

**Symptom:** PostgreSQL has data but ClickHouse tables are empty

**Diagnostic steps:**

**Step 1: Verify Redpanda Connect is healthy**
```bash
curl http://localhost:4196/ready
# Should return: {"status": "ok"}
```

**Step 2: Check if publication is tracking tables**
```bash
docker exec -it sqlmodel-postgres psql -U postgres -d sqlmodel_db

SELECT * FROM pg_publication_tables WHERE pubname = 'redpanda_cdc_publication';
# Should show: customer, product, order, orderitem
```

**Step 3: Check replication slot is active**
```sql
SELECT slot_name, active, restart_lsn FROM pg_replication_slots WHERE slot_name = 'redpanda_cdc_slot';
-- active should be 't' (true)
```

**Step 4: Check Redpanda topic has events**
```bash
docker exec -it redpanda-0 rpk topic list
# Should show: sqlmodel_cdc_events

docker exec -it redpanda-0 rpk topic consume sqlmodel_cdc_events --num 5
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

SQLModel uses **singular** table names by default: `customer`, `product`, `order`, `orderitem`

**Check these files:**
1. `docker-compose.dev.override.yaml`:
   ```yaml
   POSTGRES_CDC_TABLES: customer,product,order,orderitem
   POSTGRES_CDC_TABLES_JSON: ["customer","product","order","orderitem"]
   POSTGRES_CDC_WAIT_FOR_TABLE: customer
   ```

2. SQLModel models:
   ```python
   class Customer(SQLModel, table=True):
       # table name defaults to "customer" (lowercase class name)
       ...
   ```

**Note:** PostgreSQL requires double quotes for reserved words:
```sql
SELECT * FROM "order";  -- "order" is a reserved keyword
```

### Database Initialization Errors

**Symptom:** `python init_db.py` fails

**Diagnostic:**
```bash
# Check PostgreSQL is running
docker exec -it sqlmodel-postgres pg_isready

# Test connection manually
docker exec -it sqlmodel-postgres psql -U postgres -d sqlmodel_db -c "SELECT 1;"
```

**Solutions:**

1. **Connection refused**
   ```
   Error: could not connect to server
   ```
   Solution: Ensure PostgreSQL started successfully with `./start-oltp.sh`

2. **Wrong DATABASE_URL**
   ```
   Error: connection to database failed
   ```
   Solution: Verify DATABASE_URL in your environment
   ```bash
   # Should be:
   export DATABASE_URL="postgresql://postgres:postgres@localhost:5434/sqlmodel_db"
   ```

3. **Table already exists**
   ```
   Error: relation "customer" already exists
   ```
   Solution: This is usually fine, but you can drop tables first:
   ```bash
   python init_db.py --drop
   ```

### Virtual Environment Issues

**Symptom:** Import errors or missing dependencies

**Solution:**
```bash
# Recreate virtual environment
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -e .

# Verify installation
pip list | grep sqlmodel
pip list | grep fastapi
```

### API Won't Start

**Symptom:** `fastapi dev` fails or crashes

**Diagnostic:**
```bash
# Check for error messages in terminal
# Common issues:

# 1. Port already in use
lsof -i :3002

# 2. Missing dependencies
pip install -e .

# 3. Database connection failed
docker exec -it sqlmodel-postgres pg_isready
```

**Solutions:**

1. **Port conflict**
   ```bash
   # Use a different port
   fastapi dev src/main.py --port 3003
   ```

2. **Database not initialized**
   ```bash
   # Create tables first
   python init_db.py
   ```

### Replication Slot Lag

**Symptom:** Data takes a long time to appear in ClickHouse

**Check lag:**
```bash
docker exec -it sqlmodel-postgres psql -U postgres -d sqlmodel_db

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
   docker restart sqlmodel-redpanda-connect
   ```

2. **Check Moose processing** - Slow transformations can cause backpressure
   ```bash
   # Monitor Moose console for slow queries
   ```

### Reset Everything

**When all else fails, complete reset:**

```bash
# Stop all services
docker compose -f ../../packages/shared/cdc/docker-compose.postgres.yaml \
  -f docker-compose.oltp.yaml \
  -f docker-compose.dev.override.yaml down -v

# Remove volumes (WARNING: destroys all data)
docker volume rm sqlmodel-example_postgres-data

# Restart from scratch
export REDPANDA_LICENSE="your_license_key"
./start-oltp.sh    # Terminal 1
moose dev          # Terminal 2
python init_db.py  # Terminal 3
fastapi dev src/main.py --port 3002  # Terminal 3 (after init completes)
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
docker restart sqlmodel-redpanda-connect
docker logs -f sqlmodel-redpanda-connect
```

### Check Shared CDC Configuration

For detailed information about the CDC infrastructure and environment variables:

**See:** [Shared CDC Documentation](../../packages/shared/cdc/README.md)

### More Help

- **[Database Management Guide](docs/DATABASE_MANAGEMENT.md)** - Initialization strategies
- **[FastAPI CLI Guide](docs/FASTAPI_CLI_GUIDE.md)** - Using the dev server
- **[Why SQLModel?](docs/WHY_SQLMODEL.md)** - Understanding SQLModel benefits
- **[Shared CDC README](../../packages/shared/cdc/README.md)** - Template system documentation

## Testing with the Test Client

The React test client works with this backend:

```bash
# In another terminal
cd apps/test-client
pnpm install
pnpm dev
```

Visit http://localhost:3001 to:

- Generate random customers and products
- Create orders with multiple items
- Update order status
- Delete orders
- Watch data flow through CDC pipeline

## Verifying the CDC Pipeline

### Check PostgreSQL

```bash
# Connect to PostgreSQL
docker exec -it sqlmodel-postgres psql -U postgres -d sqlalchemy_db

# View data
SELECT * FROM customer LIMIT 5;
SELECT * FROM "order" LIMIT 5;
```

### Check ClickHouse

```bash
# Connect to ClickHouse
docker exec -it moose-clickhouse clickhouse-client -u panda --password pandapass

# View dimensions
SELECT * FROM local.customer_dim LIMIT 5;
SELECT * FROM local.product_dim LIMIT 5;

# View facts
SELECT * FROM local.order_fact LIMIT 5;
SELECT * FROM local.orderitem_fact LIMIT 5;

# Check CDC metadata
SELECT order_id, customer_name, total, is_deleted, lsn
FROM local.order_fact
ORDER BY lsn DESC
LIMIT 10;
```

## Environment Variables

| Variable       | Default                                                       | Description                              |
| -------------- | ------------------------------------------------------------- | ---------------------------------------- |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5434/sqlalchemy_db` | PostgreSQL connection                    |
| `AUTO_INIT_DB` | `false`                                                       | Auto-create tables on startup (dev only) |

## Documentation

- [QUICK_START.md](QUICK_START.md) - Alternative quick start guide
- [docs/DATABASE_MANAGEMENT.md](docs/DATABASE_MANAGEMENT.md) - Database initialization strategies
- [docs/FASTAPI_CLI_GUIDE.md](docs/FASTAPI_CLI_GUIDE.md) - Using FastAPI dev server
- [Main README](../../README.md) - Project overview

## Technology Stack

- **Python:** 3.10+
- **ORM:** **SQLModel** (built on SQLAlchemy 2.0 + Pydantic v2)
- **API:** FastAPI + Uvicorn
- **Validation:** Automatic via Pydantic (built into SQLModel)
- **Database:** PostgreSQL 15
- **CDC:** Redpanda Connect (Enterprise)
- **Streaming:** Redpanda (Kafka-compatible)
- **OLAP:** Moose + ClickHouse

### Why This Stack?

**SQLModel + FastAPI = Perfect Match**

- Both created by Sebastián Ramírez
- Designed to work seamlessly together
- Minimal boilerplate, maximum productivity
- Industry-leading developer experience

**Modern Python Best Practices**

- Type hints throughout
- Pydantic v2 for validation (Rust-powered performance)
- SQLAlchemy 2.0 modern API
- Async-ready architecture

## Learn More

### Understanding SQLModel

- **[Why SQLModel?](docs/WHY_SQLMODEL.md)** - Comprehensive guide to SQLModel's benefits
- [SQLModel Documentation](https://sqlmodel.tiangolo.com/) - Official docs
- [SQLModel GitHub](https://github.com/tiangolo/sqlmodel) - Source code and examples

### Core Technologies

- [FastAPI Documentation](https://fastapi.tiangolo.com/) - Web framework
- [SQLAlchemy 2.0 Documentation](https://docs.sqlalchemy.org/) - Database layer
- [Pydantic Documentation](https://docs.pydantic.dev/) - Validation layer
- [Moose Documentation](https://docs.fiveonefour.com/moose/) - Stream processing
- [PostgreSQL Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html) - CDC mechanism

### Project-Specific Guides

- [Database Management](docs/DATABASE_MANAGEMENT.md) - Initialization strategies
- [FastAPI CLI Guide](docs/FASTAPI_CLI_GUIDE.md) - Using the dev server
- [Main README](../../README.md) - Full project overview
- [TypeORM Example](../typeorm-example/README.md) - JavaScript comparison

---

**Need help?** Check the [main documentation](../../README.md) or refer to [Why SQLModel?](docs/WHY_SQLMODEL.md) for detailed explanations.
