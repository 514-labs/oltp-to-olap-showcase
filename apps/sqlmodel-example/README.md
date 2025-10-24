# SQLModel CDC Example

**Real-time PostgreSQL CDC → Moose → ClickHouse with Python**

Transform SQLModel models into denormalized OLAP tables with real-time CDC replication using FastAPI.

> **What is SQLModel?** A modern Python library that combines SQLAlchemy (database) and Pydantic (validation) into a single, type-safe model definition. Created by Sebastián Ramírez (FastAPI's creator), it's designed specifically for FastAPI applications. See [Why SQLModel?](docs/WHY_SQLMODEL.md) for a detailed explanation.

> **Note:** This directory is named `sqlalchemy-example` for consistency across the project, but the implementation now uses **SQLModel** (which is built on SQLAlchemy 2.0).

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

- Python 3.10 or higher
- Docker and Docker Compose
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

**Set Redpanda License:**
```bash
export REDPANDA_LICENSE="your_license_key_here"
```

**Terminal 1: Start PostgreSQL**
```bash
./start-oltp.sh
```

**Terminal 2: Start Moose (CDC infrastructure)**
```bash
moose dev
```

Expected output: `⏳ Waiting for tables to be created...`

**Terminal 3: Initialize database and start API**
```bash
# First time: create tables
python init_db.py

# Start FastAPI server
fastapi dev src/main.py --port 3002
```

### Verify It's Working

**Health Check:**
```bash
curl http://localhost:3002/health
```

**API Documentation:**
- Swagger UI: http://localhost:3002/docs
- ReDoc: http://localhost:3002/redoc

**Create Test Data:**
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

# Create a product
curl -X POST http://localhost:3002/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Mouse",
    "category": "Electronics",
    "price": "29.99"
  }'
```

**Verify CDC Pipeline:**
```bash
# Connect to ClickHouse
docker exec -it moose-clickhouse clickhouse-client -u panda --password pandapass

# Query the data (should appear within seconds)
SELECT * FROM local.customer_dim LIMIT 5;
SELECT * FROM local.product_dim LIMIT 5;
```

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
  customer_name: string;    // Denormalized from customer
  customer_email: string;   // Denormalized from customer
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

## Common Issues

### SSL Connection Errors

**Issue:** CDC connector fails with SSL errors

**Solution:** The CDC connector requires `?sslmode=disable` in the connection string. The default `POSTGRES_CDC_DSN` in `docker-compose.dev.override.yaml` already includes it.

### Table Name Mismatches

**Issue:** CDC events not flowing to ClickHouse

**Solution:** Ensure table names are singular without underscores:
- `customer` not `customers`
- `order` not `orders`
- `orderitem` not `order_items`

Ensure `POSTGRES_CDC_TABLES` / `POSTGRES_CDC_TABLES_JSON` match your actual table names.

### Data Not Appearing in ClickHouse

**Troubleshooting steps:**
1. Check Moose is running: `moose dev` output should show no errors
2. Verify CDC connector: Check Redpanda Connect logs
3. Query PostgreSQL: Ensure data exists in source tables
4. Check ClickHouse: Tables should exist even if empty
5. Review table naming: Must match exactly

### Virtual Environment Issues

```bash
# Recreate virtual environment
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -e .
```

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

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5434/sqlalchemy_db` | PostgreSQL connection |
| `AUTO_INIT_DB` | `false` | Auto-create tables on startup (dev only) |

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
