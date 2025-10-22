# Quick Start: Type-Safe SQLAlchemy → Moose

## Generate Schemas

```bash
cd apps/sqlalchemy-example

# Generate Pydantic schemas from SQLAlchemy models
uv run python -m src.utils.codegen generate

# Or use CLI wrapper
./codegen generate
```

## What Gets Generated

**Input**: SQLAlchemy models in `src/models/`

```python
class Customer(Base):
    id = Column(Integer, primary_key=True)
    email = Column(String(255))
    # ...
```

**Output**: `src/schemas.py` with explicit types

```python
class Customer(BaseModel):
    id: int
    email: str = Field(max_length=255)
    # ✅ Full IDE autocomplete

class CustomerDimension(Customer, CdcFields):
    # ✅ OLAP schema with CDC tracking
    pass
```

## Usage Examples

### 1. Type-Safe Transformations

```python
from src.schemas import CustomerDimension

def transform(event: dict) -> CustomerDimension:
    return CustomerDimension(
        **event,
        is_deleted=0,
        lsn=12345
    )
    # ✅ IDE knows all fields
```

### 2. Moose OLAP Tables

```python
from moose_lib import OlapTable
from src.schemas import CustomerDimension

CustomerTable = OlapTable[CustomerDimension](
    "dim_customer",
    order_by_fields=["id"],
    # ✅ Type-safe configuration
)
```

### 3. FastAPI Endpoints

```python
from fastapi import FastAPI
from src.schemas import Customer

@app.post("/customers", response_model=Customer)
def create(customer: Customer):
    # ✅ Automatic validation
    return customer
```

## Test Type Safety

```bash
# Run examples
uv run python test_type_safety.py

# Static type checking
uv run mypy test_type_safety.py
```

## Workflow

1. **Edit** SQLAlchemy models in `src/models/`
2. **Regenerate** schemas: `uv run python -m src.utils.codegen generate`
3. **Use** with full type hints everywhere

## Learn More

- [`CODEGEN.md`](CODEGEN.md) - Detailed usage guide
- [`docs/TYPE_SAFETY_SOLUTION.md`](docs/TYPE_SAFETY_SOLUTION.md) - Complete architecture
- [`test_type_safety.py`](test_type_safety.py) - Working examples
