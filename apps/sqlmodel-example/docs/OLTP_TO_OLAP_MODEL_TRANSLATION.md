# OLTP to OLAP Model Translation Guide

## Overview

This document explains how we transform SQLModel OLTP models (PostgreSQL) into Pydantic OLAP models (ClickHouse) for CDC processing, leveraging Python class features and Pydantic validators.

## Table of Contents

- [Core Python Features Used](#core-python-features-used)
- [Translation Pattern](#translation-pattern)
- [Multiple Inheritance Strategy](#multiple-inheritance-strategy)
- [Handling Delete Events](#handling-delete-events)
- [Type Mappings](#type-mappings)
- [Step-by-Step Example](#step-by-step-example)
- [Best Practices](#best-practices)

---

## Core Python Features Used

### 1. Multiple Inheritance

Combine SQLModel base classes with CDC metadata using Python's multiple inheritance:

```python
class Customer(CustomerBase, CdcCdcOlapModelBase):
    #           ↑              ↑
    #           |              └─ CDC fields + validation logic
    #           └─ Business fields from OLTP model
```

**How it works:**
- Python's Method Resolution Order (MRO) combines both parent classes
- `CustomerBase` provides business fields (email, name, etc.)
- `CdcOlapModelBase` provides CDC fields (is_deleted, lsn) and validation
- Final model has both sets of fields automatically

### 2. @model_validator(mode='before')

Preprocess data before Pydantic validation runs:

```python
@model_validator(mode='before')
@classmethod
def remove_none_values(cls, data: Any) -> Any:
    """Runs BEFORE field validation"""
    if isinstance(data, dict):
        return {k: v for k, v in data.items() if v is not None}
    return data
```

**Key point:** This solves the CDC delete event problem where fields are `None` but ClickHouse columns are non-nullable.

### 3. Field(default=...) and Field(default_factory=...)

Provide fallback values when fields are missing:

```python
# Static default
email: str = Field(default='')

# Dynamic default (called each time)
createdAt: datetime = Field(default_factory=datetime.now)
```

**Important distinction:**
- `Field(default='')` applies when field is **missing from dict**
- `Field(default='')` does NOT apply when field is **explicitly None**
- That's why we need the `@model_validator` to remove None values first

### 4. Annotated[type, "metadata"]

Add ClickHouse-specific type hints:

```python
id: Annotated[int, "uint64"]                      # ClickHouse UInt64
status: Annotated[str, "LowCardinality"]          # Dictionary encoding
quantity: Annotated[int, "uint8"]                 # ClickHouse UInt8
```

**How it works:**
- Moose reads the metadata string ("uint64", "LowCardinality")
- Generates appropriate ClickHouse DDL during table creation
- Python validation still uses the base type (int, str)

### 5. Pydantic BaseModel

Automatic validation and serialization:

```python
class CdcCdcOlapModelBase(BaseModel):
    # Pydantic automatically:
    # - Validates types at runtime
    # - Converts compatible types (str → int, etc.)
    # - Serializes to dict/JSON
    # - Provides .model_dump(), .model_validate(), etc.
```

---

## Translation Pattern

### OLTP Model (src/db/models.py)

```python
from sqlmodel import Field, Relationship, SQLModel
from typing import Optional

class CustomerBase(SQLModel):
    email: str = Field(unique=True, nullable=False, max_length=255)
    name: str = Field(min_length=1, max_length=255)
    country: str = Field(max_length=100)
    city: str = Field(max_length=100)

class Customer(CustomerBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    createdAt: Optional[datetime] = Field(default=datetime.now())

    # SQLAlchemy relationship
    orders: list["Order"] = Relationship(back_populates="customer")
```

**Characteristics:**
- SQLModel (combines SQLAlchemy + Pydantic)
- Database constraints (unique, nullable, max_length)
- Relationships for foreign keys
- `table=True` for ORM mapping
- Optional fields with database defaults

### OLAP Model (moose/models/models.py)

```python
from pydantic import BaseModel, Field, model_validator
from typing import Annotated

class Customer(CustomerBase, CdcCdcOlapModelBase):
    id: Annotated[int, "uint64"]
    createdAt: datetime = Field(default_factory=datetime.now)

    # Override base fields with defaults for CDC delete events
    email: str = Field(default='')
    name: str = Field(default='')
    country: str = Field(default='')
    city: str = Field(default='')
```

**Characteristics:**
- Pure Pydantic (no SQLAlchemy)
- ClickHouse type hints (uint64, LowCardinality)
- Field defaults for delete events
- No relationships (denormalized)
- Inherits CDC fields from CdcOlapModelBase

---

## Multiple Inheritance Strategy

### Inheritance Chain

```
BaseModel (Pydantic)
    ↓
CdcFields (adds is_deleted, lsn)
    ↓
CdcOlapModelBase (adds @model_validator)
    ↓         ↘
CustomerBase → Customer (final OLAP model)
(from OLTP)
```

### Why This Works

**Python's MRO (Method Resolution Order):**

```python
class Customer(CustomerBase, CdcCdcOlapModelBase):
    pass

# MRO: Customer → CustomerBase → CdcOlapModelBase → CdcFields → BaseModel

# Fields collected from all parents:
# - email, name, country, city (from CustomerBase)
# - is_deleted, lsn (from CdcFields via CdcOlapModelBase)
# - id, createdAt (overridden in Customer)

# Methods inherited:
# - remove_none_values() from CdcOlapModelBase
# - All Pydantic methods from BaseModel
```

**Benefits:**
- Reuse OLTP field definitions (DRY principle)
- Automatically get CDC fields in all models
- Validator applies to all models without repetition
- Easy to add new models (just inherit from CdcOlapModelBase)

---

## Handling Delete Events

### The Problem

CDC delete events from PostgreSQL only contain the primary key:

```json
{
  "metadata": {
    "table": "product",
    "operation": "delete",
    "lsn": "0/1A2B3C4"
  },
  "payload": {
    "id": 123,
    "name": null,
    "category": null,
    "price": null
  }
}
```

**Issue:** ClickHouse LowCardinality columns cannot be nullable:

```python
category: Annotated[str, "LowCardinality"] = Field(default='')

# Attempting to validate:
Product(id=123, category=None)  # ❌ ValidationError: expected str, got None
```

### The Solution: @model_validator(mode='before')

**Step 1:** Remove None values before validation

```python
class CdcCdcOlapModelBase(CdcFields):
    @model_validator(mode='before')
    @classmethod
    def remove_none_values(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Remove all keys with None values
            return {k: v for k, v in data.items() if v is not None}
        return data
```

**Step 2:** Pydantic applies Field defaults for missing keys

```python
# Input to validator:
{"id": 123, "category": None, "price": None}

# After validator (None removed):
{"id": 123}

# Pydantic sees missing fields, applies defaults:
Product(
    id=123,
    category='',    # Field(default='') applied
    price=0.0       # Field(default=0.0) applied
)
```

### Why This Scales

- **One validator** handles all models (defined in CdcOlapModelBase)
- **No per-model logic** needed in transformation code
- **Works for any field type** (strings, numbers, dates)
- **Preserves valid data** (only removes None, keeps 0, False, '')

---

## Type Mappings

### PostgreSQL (OLTP) → ClickHouse (OLAP)

| PostgreSQL Type | SQLModel Type | ClickHouse Type | Pydantic OLAP Type |
|----------------|---------------|-----------------|-------------------|
| SERIAL / BIGSERIAL | `Optional[int]` | UInt64 | `Annotated[int, "uint64"]` |
| VARCHAR(n) | `str` | String | `str` |
| VARCHAR(n) (low cardinality) | `str` | LowCardinality(String) | `Annotated[str, "LowCardinality"]` |
| NUMERIC / DECIMAL | `Decimal` | Float64 | `float` |
| TIMESTAMP | `datetime` | DateTime64 | `datetime` |
| INTEGER | `int` | Int32 | `int` |
| SMALLINT | `int` | Int16 or UInt8 | `Annotated[int, "uint8"]` |
| BOOLEAN | `bool` | UInt8 | `int` (0 or 1) |

### ClickHouse Type Optimizations

#### UInt64 for IDs
```python
# Why: IDs are never negative, UInt64 doubles the positive range
id: Annotated[int, "uint64"]  # Range: 0 to 2^64-1 (18 quintillion)
# vs
id: int                        # Range: -2^63 to 2^63-1
```

#### LowCardinality for Enums/Categories
```python
# Why: Dictionary encoding saves space and speeds up queries
status: Annotated[str, "LowCardinality"]  # For: status, category, country, etc.

# Storage comparison (1M rows with 10 unique statuses):
# String: 1M * avg_length (e.g., 10 bytes) = 10 MB
# LowCardinality: Dictionary (10 * 10 bytes) + Indices (1M * 1 byte) = 1.1 MB
```

#### UInt8 for Small Integers
```python
# Why: Quantity rarely exceeds 255, save space
quantity: Annotated[int, "uint8"]  # Range: 0-255 (1 byte)
# vs
quantity: int                      # Range: -2^31 to 2^31-1 (4 bytes)
```

---

## Step-by-Step Example

### Step 1: OLTP Model Definition

**File:** `src/db/models.py`

```python
class ProductBase(SQLModel):
    name: str = Field(min_length=1, max_length=255, nullable=False)
    category: str = Field(min_length=1, max_length=100, nullable=False, index=True)
    price: float = Field(gt=0, nullable=False)

class Product(ProductBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    createdAt: Optional[datetime] = Field(default=datetime.now())

    # Relationship
    orderItems: list["OrderItem"] = Relationship(back_populates="product")
```

### Step 2: OLAP Model Translation

**File:** `moose/models/models.py`

```python
class Product(ProductBase, CdcCdcOlapModelBase):
    """
    Product OLAP model for ClickHouse.

    Inheritance:
    - ProductBase: Business fields (name, category, price)
    - CdcOlapModelBase: CDC fields + delete event handling
    """
    # ClickHouse type optimizations
    id: Annotated[int, "uint64"]

    # Required field with default for delete events
    createdAt: datetime = Field(default_factory=datetime.now)

    # Override base fields with defaults
    name: str = Field(default='')
    category: Annotated[str, "LowCardinality"] = Field(default='')
    price: float = Field(default=0.0)

    # Note: orderItems relationship removed (use JOINs in queries)
```

### Step 3: How It Works at Runtime

**Insert/Update Event:**
```python
payload = {
    "id": 123,
    "name": "Laptop",
    "category": "Electronics",
    "price": 999.99,
    "createdAt": "2025-01-15T10:30:00",
    "is_deleted": 0,
    "lsn": 456789
}

# All fields present → validation succeeds
product = Product(**payload)
# Product(id=123, name='Laptop', category='Electronics', price=999.99, ...)
```

**Delete Event:**
```python
payload = {
    "id": 123,
    "name": None,
    "category": None,
    "price": None,
    "createdAt": None,
    "is_deleted": 1,
    "lsn": 456790
}

# Step 1: @model_validator removes None values
# {"id": 123, "is_deleted": 1, "lsn": 456790}

# Step 2: Pydantic applies Field defaults
product = Product(**payload)
# Product(id=123, name='', category='', price=0.0, createdAt=<now>, ...)
```

---

## Best Practices

### 1. Always Inherit from CdcOlapModelBase

```python
# ✅ Correct
class MyModel(MyModelBase, CdcOlapModelBase):
    pass

# ❌ Wrong - no delete event handling
class MyModel(MyModelBase, CdcFields):
    pass
```

### 2. Override All Required Fields with Defaults

```python
# ✅ Correct - has default for delete events
status: Annotated[str, "LowCardinality"] = Field(default='')

# ❌ Wrong - will fail on delete events
status: Annotated[str, "LowCardinality"]
```

### 3. Use Appropriate ClickHouse Types

```python
# ✅ Correct
id: Annotated[int, "uint64"]           # IDs
status: Annotated[str, "LowCardinality"]  # Enums/categories
quantity: Annotated[int, "uint8"]      # Small integers

# ❌ Wrong - missing optimizations
id: int
status: str
quantity: int
```

### 4. Remove Relationships

```python
# ✅ Correct - no relationships in OLAP
class Customer(CustomerBase, CdcCdcOlapModelBase):
    pass  # orders relationship removed

# ❌ Wrong - relationships don't work in Pydantic BaseModel
class Customer(CustomerBase, CdcCdcOlapModelBase):
    orders: list["Order"] = Relationship(...)  # Error!
```

### 5. Use default_factory for Mutable Defaults

```python
# ✅ Correct - creates new datetime each time
createdAt: datetime = Field(default_factory=datetime.now)

# ❌ Wrong - all instances share same datetime
createdAt: datetime = Field(default=datetime.now())
```

### 6. Document Type Changes

```python
class Order(OrderBase, CdcCdcOlapModelBase):
    """
    OLTP → OLAP Transformations:
    - total: Decimal → float (ClickHouse Float64)
    - status: str → Annotated[str, "LowCardinality"]
    """
    total: float = Field(default=0.0)
    status: Annotated[str, "LowCardinality"] = Field(default='')
```

---

## Summary

This translation pattern leverages core Python and Pydantic features:

| Feature | Purpose | Benefit |
|---------|---------|---------|
| **Multiple Inheritance** | Combine OLTP base + CDC metadata | Code reuse, automatic field inheritance |
| **@model_validator** | Preprocess delete events | Remove None values before validation |
| **Field(default=...)** | Provide fallback values | Handle missing fields gracefully |
| **Annotated[type, "hint"]** | ClickHouse type mapping | Storage optimization, faster queries |
| **Pydantic BaseModel** | Validation + serialization | Type safety, automatic conversion |

**Result:** Clean, maintainable OLAP models that handle CDC events automatically without transformation logic.

---

## Related Documentation

- [CDC Transformation Architecture](./CDC_TRANSFORMATION_ARCHITECTURE.md) - Dynamic routing and event processing
- [SQLALCHEMY_TO_OLAP_GUIDE.md](./SQLALCHEMY_TO_OLAP_GUIDE.md) - General migration guide
- [WHY_SQLMODEL.md](./WHY_SQLMODEL.md) - Why we use SQLModel for OLTP models
