# SQLAlchemy CDC Example

**Real-time PostgreSQL CDC → Moose → ClickHouse with Python/SQLAlchemy**

Transform SQLAlchemy ORM models into denormalized OLAP tables with real-time CDC replication.

## 🎯 What This Does

- ✅ SQLAlchemy models automatically streamed to ClickHouse
- ✅ **Full type safety**: Static Pydantic schemas with IDE autocomplete
- ✅ Real-time CDC using Redpanda Connect
- ✅ Denormalized star schema for fast analytics
- ✅ FastAPI with automatic OpenAPI docs
- ✅ Python ecosystem equivalent of TypeORM example

**Architecture:** PostgreSQL → Redpanda Connect → Redpanda → Moose Flows → ClickHouse

## 🔒 Type Safety

This project uses **static code generation** to maintain full type hints throughout:

```bash
# Generate Pydantic schemas from SQLAlchemy models
uv run python -m src.utils.codegen generate
```

**Result:** Complete IDE autocomplete and type checking in transformations, API endpoints, and Moose OLAP definitions.

📖 **See**: [`docs/TYPE_SAFETY_SOLUTION.md`](docs/TYPE_SAFETY_SOLUTION.md) for complete details.

## 🔄 Python to OLAP Conversion

This example demonstrates how to convert SQLAlchemy models to Moose OLAP tables:

### SQLAlchemy Model (OLTP)

```python
class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    country = Column(String(100), nullable=False)
    city = Column(String(100), nullable=False)

    # Relationships (removed in OLAP)
    orders = relationship("Order", back_populates="customer")
```

### Moose OLAP Table (TypeScript)

```typescript
export interface CustomerDimension {
  id: UInt64; // Integer → UInt64
  email: string;
  name: string;
  country: string;
  city: string;
  created_at: Date;
  // Removed: orders (relationship)
}

export const CustomerDimensionTable = new OlapTable<CustomerDimension & CdcFields>('dim_customer', {
  orderByFields: ['id'],
  engine: ClickHouseEngines.ReplacingMergeTree,
  ver: 'lsn',
  isDeleted: 'is_deleted',
});
```

## 🚀 Quick Start

⚠️ **Requires [Redpanda Enterprise License](../typeorm-example/LICENSE_SETUP.md)** - Free 30-day trial available

### Prerequisites

- Python 3.10+
- Docker & Docker Compose
- Redpanda Enterprise License
- Moose CLI

### 1. Install Dependencies

**Option A: Using UV (Recommended - 10x faster!)**

```bash
cd apps/sqlalchemy-example

# Install UV if you don't have it
# curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment and install dependencies
uv venv          # Creates .venv/
uv pip install -e .  # Installs in <1 second!
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

**Option B: Using pip**

```bash
cd apps/sqlalchemy-example

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -e .
```

**What gets installed:**

- FastAPI + Uvicorn (API server)
- SQLAlchemy 2.0 (ORM)
- Pydantic v2 (validation & serialization)
- PostgreSQL driver
- Custom schema auto-generation utility

### 2. Set License

```bash
export REDPANDA_LICENSE="your_license_key_here"
```

### 3. Start Infrastructure

```bash
# Terminal 1: Start PostgreSQL
./start-oltp.sh

# Terminal 2: Start Moose (keeps running)
moose dev
```

**Expected:** Moose will wait for tables to be created...

### 4. Start FastAPI Application

```bash
# Terminal 3: Start the API
python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 3002
```

**What happens:**

- PostgreSQL starts with logical replication enabled
- Tables created via SQLAlchemy
- CDC publication created automatically
- Redpanda Connect starts streaming changes
- ✨ Your CDC pipeline is live!

### 5. Test the Pipeline

Visit http://localhost:3002/docs for interactive API documentation!

**Or use curl:**

```bash
# Create a customer
curl -X POST http://localhost:3002/api/customers \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User", "country": "USA", "city": "NYC"}'

# Create a product
curl -X POST http://localhost:3002/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Laptop", "category": "Electronics", "price": 999.99}'

# Create an order
curl -X POST http://localhost:3002/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_id": 1, "status": "pending", "total": 999.99}'

# Create an order item
curl -X POST http://localhost:3002/api/order-items \
  -H "Content-Type: application/json" \
  -d '{"order_id": 1, "product_id": 1, "quantity": 1, "price": 999.99}'
```

### 6. Query ClickHouse

```bash
# Check data in ClickHouse
docker exec -it example-sqlalchemy-to-olap-clickhousedb-1 \
  clickhouse-client -u panda --password pandapass \
  --query "SELECT * FROM local.dim_customer LIMIT 10"
```

## 🏗️ Project Structure

```
sqlalchemy-example/
├── src/
│   ├── models/              # SQLAlchemy ORM models
│   │   ├── base.py          # Database configuration
│   │   ├── customer.py      # Customer model
│   │   ├── product.py       # Product model
│   │   ├── order.py         # Order model
│   │   └── order_item.py    # OrderItem model
│   ├── main.py              # FastAPI application
│   └── schemas.py           # Pydantic schemas
│
├── app/
│   ├── models.ts            # OLAP type definitions (converted from SQLAlchemy)
│   ├── sinkTables.ts        # ClickHouse table definitions
│   ├── sinkTopics.ts        # Kafka sink topics
│   ├── transformations.ts   # CDC transformation logic
│   └── sources/
│       └── externalTopics.ts # CDC event source
│
├── docker-compose.oltp.yaml           # PostgreSQL service
├── docker-compose.dev.override.yaml   # CDC services
├── redpanda-connect.yaml              # CDC configuration
├── moose.config.toml                  # Moose settings
├── pyproject.toml                     # Python dependencies
│
├── start-oltp.sh            # Start OLTP (PostgreSQL)
└── init-postgres.sh         # PostgreSQL init (auto-run)
```

## 📊 Data Model

### OLTP (SQLAlchemy)

```
Customer (1) ──< Order (M) ──< OrderItem (M) >── Product (1)
```

- **Customer**: email, name, country, city
- **Product**: name, category, price
- **Order**: customer_id, order_date, status, total
- **OrderItem**: order_id, product_id, quantity, price

### OLAP (ClickHouse)

```
Dimensions:           Fact:
- dim_customer        fact_order_item
- dim_product            ├─> customer_id
- dim_order              ├─> product_id
                         └─> order_id
```

All dimension attributes denormalized into fact table for fast queries.

## 🔄 Conversion Mapping

| SQLAlchemy Type           | ClickHouse Type | Notes                    |
| ------------------------- | --------------- | ------------------------ |
| `Integer`                 | `UInt64`        | Optimized for ClickHouse |
| `String(N)`               | `String`        | Variable length          |
| `Numeric(10,2)`           | `Float64`       | Decimal to float         |
| `DateTime(timezone=True)` | `DateTime`      | UTC timestamps           |
| `relationship()`          | _removed_       | No JOINs in OLAP         |

## 🚨 Common Issues

### "Module not found"

**Solution:** Activate virtual environment: `source venv/bin/activate`

### "Waiting for tables" persists

**Solution:** Start the FastAPI server to create tables

### Redpanda Connect won't start

**Solution:** Check license is set: `echo $REDPANDA_LICENSE`

### Import errors

**Solution:** Install in editable mode: `pip install -e .`

## 🔗 Useful Links

**API Endpoints:**

- API Server: http://localhost:3002
- API Documentation: http://localhost:3002/docs
- ReDoc: http://localhost:3002/redoc
- Redpanda Connect Health: http://localhost:4196/ready

**Admin UIs:**

- Moose Console: http://localhost:5002

## 📦 Available Commands

```bash
# Python/FastAPI
python -m uvicorn src.main:app --reload --port 3002  # Start API
python -m pytest                                       # Run tests

# Docker
./start-oltp.sh              # Start PostgreSQL
docker compose -f docker-compose.oltp.yaml down  # Stop PostgreSQL

# Moose
moose dev                    # Start Moose dev server
```

## 🛠️ Technology Stack

- **OLTP:** PostgreSQL 15 + SQLAlchemy 2.0
- **API:** FastAPI + Uvicorn + Pydantic
- **CDC:** Redpanda Connect (Enterprise) + PostgreSQL CDC connector
- **Streaming:** Redpanda (Kafka-compatible)
- **OLAP:** Moose 0.6 + ClickHouse
- **Language:** Python 3.10+ / TypeScript 5

## 💡 Auto-Generated Pydantic Schemas

**No duplicate type definitions!**

This project automatically generates Pydantic schemas from SQLAlchemy models using a custom utility (`src/utils/schema_generator.py`):

```python
from src.utils.schema_generator import sqlalchemy_to_pydantic
from src.models.customer import Customer as CustomerModel

# Auto-generate Pydantic schemas from SQLAlchemy models
Customer = sqlalchemy_to_pydantic(CustomerModel, exclude={"orders"})
CustomerCreate = sqlalchemy_to_pydantic(CustomerModel, exclude={"id", "created_at", "orders"})
```

**Why custom utility?**

- ⚠️ The official `pydantic-sqlalchemy` library only supports SQLAlchemy 1.3-1.4 (not 2.0)
- ⚠️ It's no longer maintained - the repo README recommends using SQLModel instead
- ✅ Our custom utility works with SQLAlchemy 2.0 and Pydantic v2
- ✅ Zero external dependencies

**Benefits:**

- ✅ Zero duplication - schemas auto-sync with models
- ✅ DRY (Don't Repeat Yourself)
- ✅ SQLAlchemy 2.0 + Pydantic v2 compatible
- ✅ 80% less boilerplate code

**See it in action:**

- Check `src/schemas.py` - all schemas auto-generated!
- Review `src/utils/schema_generator.py` - the utility
- **[Auto Schema Generation Guide](docs/AUTO_SCHEMA_GENERATION.md)** - Comparison of different approaches
- **[Manual vs Auto Comparison](docs/SCHEMA_COMPARISON.md)** - Side-by-side code comparison

**Alternative:** For new projects, consider **SQLModel** which combines SQLAlchemy and Pydantic into one model definition.

## 📚 Learn More

### TypeORM Comparison

This example is the **Python equivalent** of the [TypeORM example](../typeorm-example/README.md):

| Feature         | TypeORM Example       | SQLAlchemy Example |
| --------------- | --------------------- | ------------------ |
| Language        | TypeScript            | Python             |
| ORM             | TypeORM               | SQLAlchemy         |
| API Framework   | Express               | FastAPI            |
| Models          | TypeScript decorators | Python classes     |
| API Docs        | Scalar                | OpenAPI (Swagger)  |
| Port            | 3000                  | 3002               |
| PostgreSQL Port | 5433                  | 5434               |

Both examples:

- Use the same CDC pipeline architecture
- Convert ORM models to Moose OLAP tables
- Stream data in real-time to ClickHouse
- Support full CRUD operations

### External Resources

- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Moose Documentation](https://docs.fiveonefour.com/moose/)
- [PostgreSQL Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)

---

**Need help?** Check the **[TypeORM example documentation](../typeorm-example/docs/README.md)** for detailed CDC pipeline guides.
