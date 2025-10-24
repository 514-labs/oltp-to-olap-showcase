# Type Safety Solution: SQLAlchemy → Pydantic → Moose

## Problem Statement

How to use SQLAlchemy models with Moose OLAP while maintaining:

1. ✅ **Dev-time type hints** - IDE autocomplete and type checking
2. ✅ **Moose compatibility** - Works with `OlapTable`, streams, transformations
3. ✅ **Single source of truth** - SQLAlchemy models define schema once
4. ✅ **Type safety in CDC pipelines** - Full types during transformations

## Solution: Static Code Generation

Generate **explicit Pydantic schemas** from SQLAlchemy models as actual Python code.

### Architecture

```
SQLAlchemy Models (OLTP)
    ↓
[Code Generator]
    ↓
Pydantic Schemas (Python code)
    ├─→ Base schemas (Customer, Product, Order, OrderItem)
    ├─→ CDC metadata types (CdcMetadata, CdcFields)
    └─→ OLAP schemas (CustomerDimension, ProductDimension, etc.)
    ↓
Moose OLAP Tables & Transformations
```

## Implementation

### 1. Code Generator

**File**: `src/utils/codegen.py`

Introspects SQLAlchemy models and generates actual Python code (not runtime-generated classes):

```python
# Generates this actual code:
class Customer(BaseModel):
    """Generated from SQLAlchemy model: Customer"""
    id: int
    email: str = Field(max_length=255)
    name: str = Field(max_length=255)
    country: str = Field(max_length=100)
    city: str = Field(max_length=100)
    created_at: datetime
```

### 2. Generated Schemas

**File**: `src/schemas.py` (auto-generated, do not edit manually)

Contains:

**Base schemas** - Direct SQLAlchemy → Pydantic mappings:

- `Customer`, `Product`, `Order`, `OrderItem`

**CDC metadata** - Change Data Capture types:

- `CdcMetadata` - Redpanda Connect metadata wrapper
- `CdcFields` - ClickHouse CDC tracking (is_deleted, lsn)

**OLAP schemas** - Dimension/fact tables with CDC:

- `CustomerDimension(Customer, CdcFields)`
- `ProductDimension(Product, CdcFields)`
- `OrderDimension(Order, CdcFields)`
- `OrderItemFact(OrderItem, CdcFields)`

### 3. Usage Commands

```bash
# Regenerate schemas after changing SQLAlchemy models
cd apps/sqlalchemy-example
uv run python -m src.utils.codegen generate

# Or use the CLI wrapper
./codegen generate

# Test type safety
uv run python test_type_safety.py

# Static type checking
uv run mypy test_type_safety.py
```

## Benefits

### ✅ Full Type Hints

```python
from src.schemas import CustomerDimension

customer = CustomerDimension(
    id=1,
    email="john@example.com",  # IDE suggests field names
    name="John Doe",
    country="USA",
    city="New York",
    created_at=datetime.now(),
    is_deleted=0,
    lsn=12345
)

# ✅ Type checker knows all fields
customer.email      # str
customer.city       # str
customer.lsn        # int
customer.created_at # datetime
```

### ✅ Moose Compatibility

```python
# app/sinkTables.py
from moose_lib import OlapTable, ClickHouseEngines
from src.schemas import CustomerDimension

CustomerDimensionTable = OlapTable[CustomerDimension](
    "dim_customer",
    order_by_fields=["id"],
    engine=ClickHouseEngines.ReplacingMergeTree,
    ver="lsn",
    is_deleted="is_deleted",
)
```

### ✅ Type-Safe Transformations

```python
# app/transformations.py
from src.schemas import CustomerDimension, CdcMetadata

def transform_cdc_event(event: dict) -> CustomerDimension:
    """Transform CDC event with full type safety"""

    # ✅ Parse metadata with validation
    metadata = CdcMetadata(**event["_metadata"])

    # ✅ Type hints work throughout
    operation: str = metadata.operation  # "insert" | "update" | "delete"

    # ✅ Create dimension with type checking
    return CustomerDimension(
        id=event["id"],
        email=event["email"],      # IDE checks this exists
        name=event["name"],        # Type checker validates str
        country=event["country"],
        city=event["city"],
        created_at=event["created_at"],
        is_deleted=1 if metadata.operation == "delete" else 0,
        lsn=int(metadata.lsn, 16)  # Convert hex LSN to int
    )
```

### ✅ Single Source of Truth

1. Define schema once in SQLAlchemy:

   ```python
   # src/models/customer.py
   class Customer(Base):
       __tablename__ = "customers"
       id = Column(Integer, primary_key=True)
       email = Column(String(255), nullable=False)
       # ...
   ```

2. Regenerate Pydantic schemas automatically:

   ```bash
   uv run python -m src.utils.codegen generate
   ```

3. Type hints propagate everywhere

## Workflow

### Initial Setup

```bash
cd apps/sqlalchemy-example
uv run python -m src.utils.codegen generate
```

### When Modifying Models

1. **Edit SQLAlchemy model** in `src/models/`

   ```python
   # src/models/customer.py
   class Customer(Base):
       # Add new field
       phone = Column(String(20), nullable=True)
   ```

2. **Regenerate schemas**

   ```bash
   uv run python -m src.utils.codegen generate
   ```

3. **Type hints automatically update**
   - IDE now shows `customer.phone` exists
   - Type checker validates usage
   - Moose sees new field in OlapTable

4. **Update transformations** (IDE helps with autocomplete)

## Type Checking

### Runtime Validation

Pydantic validates data at runtime:

```python
customer = CustomerDimension(**data)  # Validates types, constraints
```

### Static Type Checking

Use mypy/pyright for compile-time checks:

```bash
uv run mypy src/ app/
```

## Comparison with Alternatives

### ❌ Dynamic Generation (Previous Approach)

```python
Customer = sqlalchemy_to_pydantic(CustomerModel, exclude={"orders"})
# Type: Type[BaseModel] - too generic, no IDE support
```

### ❌ Manual Schemas

```python
class Customer(BaseModel):
    id: int
    email: str
    # ... must manually sync with SQLAlchemy
```

**Problem**: Manual maintenance, drift from SQLAlchemy models

### ✅ Static Code Generation (This Solution)

```python
# Generated actual code with explicit types
class Customer(BaseModel):
    id: int
    email: str = Field(max_length=255)
    # ... auto-synced with SQLAlchemy
```

**Benefits**: Best of both worlds - automation + type hints

## Alternative for New Projects: SQLModel

If starting from scratch, consider [SQLModel](https://sqlmodel.tiangolo.com/):

```python
from sqlmodel import SQLModel, Field

class Customer(SQLModel, table=True):
    """Single class for both ORM and validation"""
    id: int = Field(primary_key=True)
    email: str = Field(max_length=255)
    name: str
    # ... works as both SQLAlchemy model AND Pydantic schema
```

**Recommendation**:

- **Existing SQLAlchemy projects** → Use this code generation approach
- **New projects** → Consider SQLModel for unified schema definition

## Files Reference

- `src/models/` - SQLAlchemy models (source of truth)
- `src/schemas.py` - Generated Pydantic schemas (do not edit)
- `src/utils/codegen.py` - Code generator
- `src/utils/schema_generator.py` - Runtime conversion utilities (legacy)
- `codegen` - CLI wrapper script
- `test_type_safety.py` - Type safety examples and tests
- `CODEGEN.md` - Usage guide
- `docs/TYPE_SAFETY_SOLUTION.md` - This document

## Summary

This solution provides **complete type safety** from OLTP (SQLAlchemy) to OLAP (Moose):

1. **SQLAlchemy models** define schema once
2. **Code generator** creates explicit Pydantic schemas
3. **IDE and type checkers** see all fields and types
4. **Moose** works seamlessly with generated schemas
5. **CDC transformations** have full type safety

Result: Professional-grade type safety without sacrificing developer ergonomics.
