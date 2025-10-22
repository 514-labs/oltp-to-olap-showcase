# Schema Code Generation

This project uses **static code generation** to convert SQLAlchemy models into Pydantic schemas with full type hints.

## Why Code Generation?

✅ **Dev-time type hints** - IDE autocomplete and type checking  
✅ **Moose OLAP compatibility** - Works with Moose Python framework  
✅ **Single source of truth** - SQLAlchemy models drive everything  
✅ **Automatic sync** - Regenerate anytime models change

## Usage

### Generate Schemas

```bash
# From project root
cd apps/sqlalchemy-example

# Run code generator
uv run python -m src.utils.codegen generate

# Or use the CLI wrapper
./codegen generate
```

### Output

Generates `src/schemas.py` with:

- **Base schemas** - Direct mappings from SQLAlchemy (Customer, Product, Order, OrderItem)
- **CDC metadata** - Types for Change Data Capture events
- **OLAP schemas** - Dimension/fact tables with CDC fields (CustomerDimension, ProductDimension, etc.)

## Type Safety Example

```python
from src.schemas import CustomerDimension

# ✅ Full type hints work
customer = CustomerDimension(
    id=1,
    email="john@example.com",
    name="John Doe",
    country="USA",
    city="New York",
    created_at=datetime.now(),
    is_deleted=0,
    lsn=12345
)

# ✅ IDE knows all fields
customer.email      # Type: str
customer.city       # Type: str
customer.created_at # Type: datetime
customer.lsn        # Type: int
```

## Using with Moose

```python
# app/models.py
from src.schemas import (
    CustomerDimension,
    ProductDimension,
    OrderDimension,
    OrderItemFact,
    CdcMetadata
)

# Export for Moose (types are preserved)
__all__ = [
    'CustomerDimension',
    'ProductDimension',
    'OrderDimension',
    'OrderItemFact',
    'CdcMetadata'
]
```

```python
# app/sinkTables.py
from moose_lib import OlapTable, ClickHouseEngines
from .models import CustomerDimension  # ✅ Full types

CustomerDimensionTable = OlapTable[CustomerDimension](
    "dim_customer",
    order_by_fields=["id"],
    engine=ClickHouseEngines.ReplacingMergeTree,
    ver="lsn",
    is_deleted="is_deleted",
)
```

```python
# app/transformations.py
from .models import CustomerDimension, CdcMetadata

def transform_customer(event: dict) -> CustomerDimension:
    """Transform CDC event to OLAP schema"""
    metadata = CdcMetadata(**event["_metadata"])

    # ✅ Type hints work here!
    customer = CustomerDimension(
        **event,
        is_deleted=1 if metadata.operation == "delete" else 0,
        lsn=int(metadata.lsn, 16)
    )

    customer.email  # ✅ IDE knows this is str
    return customer
```

## Workflow

1. **Modify SQLAlchemy models** in `src/models/`
2. **Regenerate schemas**: `uv run python -m src.utils.codegen generate`
3. **Type checking works** - IDE and mypy/pyright see all types
4. **Moose compatibility** - Use schemas directly with OlapTable

## Customization

Edit `src/utils/codegen.py` to customize generation:

- Add/remove fields
- Change type mappings
- Add custom validation
- Generate additional schema variants

## Alternative: SQLModel

For **new projects**, consider using [SQLModel](https://sqlmodel.tiangolo.com/) which combines SQLAlchemy + Pydantic:

```python
from sqlmodel import SQLModel, Field

class Customer(SQLModel, table=True):
    id: int = Field(primary_key=True)
    email: str = Field(max_length=255)
    name: str
    # ... one class for both ORM and validation
```

For **existing SQLAlchemy projects**, this code generation approach is ideal.
