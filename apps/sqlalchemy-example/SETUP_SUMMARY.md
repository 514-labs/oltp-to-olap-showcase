# SQLAlchemy CDC Example - Setup Summary

**Created:** 2025-10-21

## 🎉 What Was Created

A complete Python/SQLAlchemy CDC pipeline example that mirrors the TypeORM example.

### Core Files Created

**Python Application (22 files):**
- `pyproject.toml` - Python project configuration
- `src/models/` - 5 SQLAlchemy ORM models
  - `base.py` - Database configuration
  - `customer.py` - Customer model
  - `product.py` - Product model
  - `order.py` - Order model
  - `order_item.py` - OrderItem model
- `src/main.py` - FastAPI application (300+ lines)
- `src/schemas.py` - Pydantic validation schemas

**Moose OLAP Configuration (6 TypeScript files):**
- `app/models.ts` - OLAP type definitions converted from SQLAlchemy
- `app/sinkTables.ts` - ClickHouse table definitions
- `app/sinkTopics.ts` - Kafka sink topics
- `app/transformations.ts` - CDC transformation logic
- `app/sources/externalTopics.ts` - CDC event source
- `app/index.ts` - Main export file

**Infrastructure:**
- `docker-compose.oltp.yaml` - PostgreSQL with CDC configuration
- `docker-compose.dev.override.yaml` - Redpanda Connect CDC setup
- `redpanda-connect.yaml` - CDC connector configuration
- `moose.config.toml` - Moose framework settings
- `init-postgres.sh` - PostgreSQL initialization script
- `start-oltp.sh` - OLTP startup script

**Documentation:**
- `README.md` - Complete setup and usage guide
- `docs/SQLALCHEMY_TO_OLAP_GUIDE.md` - Detailed conversion guide
- `SETUP_SUMMARY.md` - This file

## 🔄 Conversion Patterns Demonstrated

### SQLAlchemy → Moose OLAP

The example shows how to convert:

1. **SQLAlchemy Models** → **TypeScript Interfaces**
   ```python
   class Customer(Base):
       id = Column(Integer, primary_key=True)
       name = Column(String(255))
   ```
   →
   ```typescript
   interface CustomerDimension {
       id: UInt64;
       name: string;
   }
   ```

2. **Relationships** → **Foreign Keys**
   - Removed: `relationship()`, `back_populates`
   - Kept: Foreign key columns as `UInt64`

3. **Type Mappings:**
   - `Integer` → `UInt64`
   - `String(N)` → `string`
   - `Numeric(10,2)` → `number` (Float64)
   - `DateTime(timezone=True)` → `Date`

## 📊 Side-by-Side Comparison

| Feature | TypeORM Example | SQLAlchemy Example |
|---------|----------------|-------------------|
| **Language** | TypeScript | Python |
| **ORM** | TypeORM 0.3 | SQLAlchemy 2.0 |
| **API Framework** | Express | FastAPI |
| **API Port** | 3000 | 3002 |
| **PostgreSQL Port** | 5433 | 5434 |
| **API Docs** | Scalar | Swagger/ReDoc |
| **Models** | Decorator-based | Class-based |
| **Dependencies** | npm/pnpm | pip/venv |

**Identical:**
- CDC pipeline architecture
- Moose OLAP configuration (both TypeScript)
- Same data model (Customer, Product, Order, OrderItem)
- Docker compose structure
- Redpanda Connect configuration

## 🚀 How to Use

### 1. Install Dependencies

```bash
cd apps/sqlalchemy-example
python -m venv venv
source venv/bin/activate
pip install -e .
```

### 2. Start Infrastructure

```bash
# Terminal 1: PostgreSQL
./start-oltp.sh

# Terminal 2: Moose
export REDPANDA_LICENSE="your_license"
moose dev

# Terminal 3: FastAPI
python -m uvicorn src.main:app --reload --port 3002
```

### 3. Test

Visit:
- API Docs: http://localhost:3002/docs
- Health: http://localhost:3002/health

## 📚 Key Documentation

- **[README.md](README.md)** - Complete setup guide
- **[SQLALCHEMY_TO_OLAP_GUIDE.md](docs/SQLALCHEMY_TO_OLAP_GUIDE.md)** - Conversion patterns
- **[TypeORM Docs](../typeorm-example/docs/README.md)** - Shared CDC pipeline docs

## ✨ Highlights

### 1. FastAPI with Auto-Generated Docs

```python
@app.get("/api/customers", response_model=schemas.ApiResponse)
def get_customers(db: Session = Depends(base.get_db)):
    customers = db.query(Customer).all()
    return {"success": True, "data": [schemas.Customer.model_validate(c).model_dump() for c in customers]}
```

Interactive docs at `/docs` and `/redoc`!

### 2. Auto-Generated Pydantic Schemas

```python
from pydantic_sqlalchemy import sqlalchemy_to_pydantic

# Auto-generate from SQLAlchemy models - no duplication!
CustomerCreate = sqlalchemy_to_pydantic(
    CustomerModel,
    exclude=["id", "created_at", "orders"]
)
```

Using the official `pydantic-sqlalchemy` library by tiangolo!

### 3. Pythonic Models

```python
class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)

    # Relationships (removed in OLAP)
    orders = relationship("Order", back_populates="customer")
```

Clean, readable, Pythonic!

## 🎯 Next Steps

1. **Try it out**: Follow the README setup instructions
2. **Compare**: Run both TypeORM and SQLAlchemy examples side-by-side
3. **Extend**: Add your own models and see them flow to ClickHouse
4. **Learn**: Study the conversion patterns in the guide

## 💡 Learning Value

This example teaches:
- How to convert SQLAlchemy models to OLAP tables
- Python/TypeScript interop in CDC pipelines
- FastAPI for high-performance APIs
- Type conversions between ecosystems
- Same architecture, different languages

## 🤝 Comparison with TypeORM

**Similarities:**
- ✅ Same CDC pipeline architecture
- ✅ Same Moose OLAP configuration
- ✅ Same data model
- ✅ Same denormalization patterns

**Differences:**
- 🐍 Python vs TypeScript for business logic
- ⚡ FastAPI vs Express for API
- 🔄 Different ORM syntax
- 📝 Different documentation style

**Choose based on:**
- Your team's language preference
- Existing codebase
- Ecosystem familiarity

Both are production-ready and performant!

---

**Questions?** Check the [README](README.md) or [TypeORM docs](../typeorm-example/README.md)
