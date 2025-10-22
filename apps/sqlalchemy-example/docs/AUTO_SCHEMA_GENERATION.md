# Auto-Generate Pydantic Schemas from SQLAlchemy Models

**Problem:** Writing duplicate type definitions for SQLAlchemy models and Pydantic schemas is tedious and error-prone.

**Solution:** Automatically generate Pydantic models from SQLAlchemy models.

## 🎯 Option 1: sqlalchemy-pydantic-orm (Recommended for SQLAlchemy 2.0)

### Installation

```bash
pip install sqlalchemy-pydantic-orm
```

### Usage

```python
# src/schemas_auto.py
from sqlalchemy_pydantic_orm import sqlalchemy_to_pydantic
from src.models.customer import Customer as CustomerModel
from src.models.product import Product as ProductModel
from src.models.order import Order as OrderModel
from src.models.order_item import OrderItem as OrderItemModel

# Auto-generate Pydantic models (includes ALL fields)
CustomerSchema = sqlalchemy_to_pydantic(CustomerModel)
ProductSchema = sqlalchemy_to_pydantic(ProductModel)
OrderSchema = sqlalchemy_to_pydantic(OrderModel)
OrderItemSchema = sqlalchemy_to_pydantic(OrderItemModel)

# Exclude relationships and generated fields for CREATE operations
CustomerCreate = sqlalchemy_to_pydantic(
    CustomerModel,
    exclude=["id", "created_at", "orders"]  # Exclude auto-generated and relationships
)

# Include only specific fields for READ operations
CustomerRead = sqlalchemy_to_pydantic(
    CustomerModel,
    exclude=["orders"]  # Exclude relationships to avoid circular refs
)
```

### In Your API

```python
# src/main.py
from src.schemas_auto import CustomerCreate, CustomerRead

@app.post("/api/customers", response_model=CustomerRead)
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    db_customer = CustomerModel(**customer.dict())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer
```

---

## 🎯 Option 2: Custom Utility Function

Create your own converter for full control:

```python
# src/utils/schema_generator.py
from typing import Type, Optional, Set
from pydantic import BaseModel, create_model, EmailStr, Field
from sqlalchemy import Integer, String, DateTime, Numeric, Boolean
from sqlalchemy.orm import DeclarativeMeta
from sqlalchemy.inspection import inspect
import datetime
from decimal import Decimal


def sqlalchemy_to_pydantic(
    db_model: Type[DeclarativeMeta],
    *,
    exclude: Optional[Set[str]] = None,
    include: Optional[Set[str]] = None,
    config: Optional[Type] = None,
) -> Type[BaseModel]:
    """
    Convert a SQLAlchemy model to a Pydantic model.

    Args:
        db_model: SQLAlchemy model class
        exclude: Set of field names to exclude
        include: Set of field names to include (if set, only these are included)
        config: Optional Pydantic config class

    Returns:
        Dynamically created Pydantic model
    """
    exclude = exclude or set()
    mapper = inspect(db_model)

    fields = {}
    for column in mapper.columns:
        if column.name in exclude:
            continue
        if include and column.name not in include:
            continue

        # Map SQLAlchemy types to Python types
        python_type = _map_sqlalchemy_type_to_python(column.type)

        # Handle nullable columns
        if column.nullable:
            python_type = Optional[python_type]

        # Handle default values
        default = ... if not column.nullable and column.default is None else None

        # Add validation constraints
        field_args = {}
        if isinstance(column.type, String) and column.type.length:
            field_args['max_length'] = column.type.length
        if isinstance(column.type, Numeric):
            field_args['decimal_places'] = column.type.scale or 2

        if field_args:
            fields[column.name] = (python_type, Field(default=default, **field_args))
        else:
            fields[column.name] = (python_type, default)

    # Create config if not provided
    if config is None:
        class Config:
            from_attributes = True
            arbitrary_types_allowed = True

        pydantic_config = Config
    else:
        pydantic_config = config

    # Dynamically create the model
    return create_model(
        f"{db_model.__name__}Schema",
        __config__=pydantic_config,
        **fields
    )


def _map_sqlalchemy_type_to_python(column_type):
    """Map SQLAlchemy column types to Python types."""
    type_map = {
        Integer: int,
        String: str,
        DateTime: datetime.datetime,
        Numeric: Decimal,
        Boolean: bool,
    }

    for sqlalchemy_type, python_type in type_map.items():
        if isinstance(column_type, sqlalchemy_type):
            return python_type

    return str  # Default fallback


# Example usage
if __name__ == "__main__":
    from src.models.customer import Customer as CustomerModel

    # Generate full schema
    CustomerSchema = sqlalchemy_to_pydantic(CustomerModel)

    # Generate CREATE schema (no id, no created_at, no relationships)
    CustomerCreate = sqlalchemy_to_pydantic(
        CustomerModel,
        exclude={"id", "created_at", "orders"}
    )

    # Generate READ schema (include id, exclude relationships)
    CustomerRead = sqlalchemy_to_pydantic(
        CustomerModel,
        exclude={"orders"}
    )

    print(CustomerCreate.model_json_schema())
```

### Usage in Your App

```python
# src/schemas_generated.py
from src.utils.schema_generator import sqlalchemy_to_pydantic
from src.models.customer import Customer as CustomerModel
from src.models.product import Product as ProductModel

# Generate schemas at module import time
CustomerBase = sqlalchemy_to_pydantic(
    CustomerModel,
    exclude={"id", "created_at", "orders"}
)

CustomerRead = sqlalchemy_to_pydantic(
    CustomerModel,
    exclude={"orders"}
)

ProductBase = sqlalchemy_to_pydantic(
    ProductModel,
    exclude={"id", "created_at", "order_items"}
)

ProductRead = sqlalchemy_to_pydantic(
    ProductModel,
    exclude={"order_items"}
)
```

---

## 🎯 Option 3: Pydantic's Built-in `model_validate()` with Config

Simplest approach - use Pydantic's ORM mode:

```python
# src/schemas_simple.py
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class CustomerBase(BaseModel):
    """Base schema - define once, reuse everywhere"""
    model_config = ConfigDict(from_attributes=True)

    email: str
    name: str
    country: str
    city: str


class CustomerCreate(CustomerBase):
    """For POST requests - no id/timestamps"""
    pass


class CustomerRead(CustomerBase):
    """For responses - include id/timestamps"""
    id: int
    created_at: datetime


# In your API - Pydantic automatically reads from SQLAlchemy model
@app.get("/api/customers/{id}", response_model=CustomerRead)
def get_customer(id: int, db: Session = Depends(get_db)):
    customer = db.query(CustomerModel).filter(CustomerModel.id == id).first()
    # Pydantic automatically reads from SQLAlchemy model attributes
    return customer
```

**This is what we used in the current implementation** - it's explicit and clear, which is good for educational purposes.

---

## 🎯 Option 4: Use SQLModel (Hybrid Approach)

SQLModel combines SQLAlchemy and Pydantic into one:

```python
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime


class CustomerBase(SQLModel):
    """Shared fields"""
    email: str = Field(max_length=255, index=True)
    name: str = Field(max_length=255)
    country: str = Field(max_length=100)
    city: str = Field(max_length=100)


class Customer(CustomerBase, table=True):
    """Database table"""
    __tablename__ = "customers"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    orders: List["Order"] = Relationship(back_populates="customer")


class CustomerCreate(CustomerBase):
    """API input - no id/timestamps"""
    pass


class CustomerRead(CustomerBase):
    """API output - include id/timestamps, exclude relationships"""
    id: int
    created_at: datetime
```

**One model class = database + validation!**

---

## 📊 Comparison

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **sqlalchemy-pydantic-orm** | Auto-generates, works with SQLAlchemy 2.0 | Extra dependency | Existing SQLAlchemy apps |
| **Custom utility** | Full control, no deps | More code to maintain | Custom needs |
| **Pydantic ORM mode** | Simple, explicit | Some duplication | Clear documentation/learning |
| **SQLModel** | No duplication, type-safe | Different from pure SQLAlchemy | New projects |

---

## 🚀 Recommendation for This Project

**For production apps:** Use **Option 1** (sqlalchemy-pydantic-orm) or **Option 4** (SQLModel)

**For educational/showcase:** Keep current approach (Pydantic ORM mode) because:
- ✅ Clear separation of concerns
- ✅ Easier to understand what each layer does
- ✅ Shows the pattern most teams encounter in existing codebases
- ✅ No magic - explicit is better than implicit for learning

---

## 💡 Next Steps

If you want to switch to auto-generation, I can:

1. Add `sqlalchemy-pydantic-orm` to dependencies
2. Create `src/schemas_auto.py` with auto-generated schemas
3. Update `src/main.py` to use the generated schemas
4. Keep the original `src/schemas.py` for comparison

Or create a separate **SQLModel example** (`apps/sqlmodel-example/`) showing the hybrid approach!

What would you prefer?
