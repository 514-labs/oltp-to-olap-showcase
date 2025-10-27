"""
OLAP Model Definitions for CDC Pipeline

Transforms SQLModel OLTP models into ClickHouse-optimized OLAP models.

Key Features:
- Multiple Inheritance: Combine SQLModel base classes with CDC metadata
- @model_validator: Preprocess data before validation (handle delete events)
- Annotated types: ClickHouse-specific hints (uint64, LowCardinality)

OLTP → OLAP Translation:
- SQLAlchemy types → ClickHouse types (uint64, LowCardinality, float)
- Relationships → Denormalized structure
- Nullable fields → Field defaults for delete events
"""

from moose_lib import clickhouse_default
from pydantic import BaseModel, Field, model_validator
from typing import Literal, Any, Annotated, Optional, Union, get_origin, get_args
from src.db.models import CustomerBase, ProductBase, OrderBase, OrderItemBase
from datetime import datetime
from decimal import Decimal


# ══════════════════════════════════════════════════════════════
# CDC INPUT MODELS
# ══════════════════════════════════════════════════════════════

class CdcMetadata(BaseModel):
    """CDC metadata from Debezium/PostgreSQL replication."""
    table: str  # Source table name
    operation: Literal['insert', 'update', 'delete']
    lsn: str  # Log Sequence Number, format: "high/low" hex (e.g., "0/1A2B3C4")


class RawCdcPayload(BaseModel):
    """
    Raw CDC event from Redpanda Connect.

    Delete events: payload contains only primary key, other fields are None.
    """
    metadata: CdcMetadata
    payload: Any
    

# ══════════════════════════════════════════════════════════════
# CDC METADATA FIELDS
# ══════════════════════════════════════════════════════════════

class CdcFields(BaseModel):
    """
    CDC fields for ClickHouse ReplacingMergeTree deduplication.

    ReplacingMergeTree(ver="lsn", is_deleted="is_deleted"):
    - Keeps row with highest 'lsn' during merge
    - Filters rows where 'is_deleted=1' in SELECT queries
    """
    is_deleted: Annotated[int, "uint8"]  # 0=active, 1=deleted
    lsn: int  # PostgreSQL Log Sequence Number for ordering


# ══════════════════════════════════════════════════════════════
# BASE CLASS - Delete Event Preprocessing
# ══════════════════════════════════════════════════════════════

class CdcOlapModelBase(CdcFields):
    """
    Base class for OLAP models with automatic None-to-default conversion.

    Why @model_validator(mode='before'):
    - CDC delete events have None values: {"id": 123, "status": None, "price": None}
    - ClickHouse LowCardinality fields cannot be nullable
    - Field(default='') only works for MISSING fields, not explicit None
    - Solution: Replace None with type-appropriate defaults BEFORE validation

    Inheritance: CdcOlapModelBase → CdcFields → BaseModel
    All child models get automatic None handling.
    """

    @model_validator(mode='before')
    @classmethod
    def replace_none_with_type_defaults(cls, data: Any) -> Any:
        """
        Replace None values with type-appropriate defaults via type introspection.

        Type → Default Mapping:
        - str → ''
        - int → 0
        - float → 0.0
        - bool → False
        - datetime → datetime(1970, 1, 1)
        - Decimal → Decimal('0')

        Benefit: Child classes only need to override fields for ClickHouse metadata,
        not for default values. Inherited fields automatically get type-based defaults.

        Note: Preserves valid falsy values (0, False, ''), only replaces None.
        """
        if not isinstance(data, dict):
            return data

        for field_name, field_info in cls.model_fields.items():
            if field_name not in data or data[field_name] is not None:
                continue

            field_type = field_info.annotation

            # Unwrap Optional[X] (Union[X, None])
            origin = get_origin(field_type)
            if origin is Union:
                args = [arg for arg in get_args(field_type) if arg is not type(None)]
                if args:
                    field_type = args[0]

            # Unwrap Annotated[X, ...] to get base type
            origin = get_origin(field_type)
            if origin is Annotated:
                field_type = get_args(field_type)[0]

            # Map type to default
            if field_type is str or field_type == str:
                data[field_name] = ''
            elif field_type is int or field_type == int:
                data[field_name] = 0
            elif field_type is float or field_type == float:
                data[field_name] = 0.0
            elif field_type is bool or field_type == bool:
                data[field_name] = False
            elif field_type is datetime or field_type == datetime:
                data[field_name] = datetime.fromtimestamp(0)
            elif field_type is Decimal or field_type == Decimal:
                data[field_name] = Decimal('0')

        return data


# ══════════════════════════════════════════════════════════════
# OLAP MODELS - Multiple Inheritance Pattern
# ══════════════════════════════════════════════════════════════
#
# Pattern: class Model(ModelBase, CdcOlapModelBase)
#          - ModelBase: Business fields from OLTP schema
#          - CdcOlapModelBase: CDC fields + None handling
#
# Key Transformations:
# - int → Annotated[int, "uint64"] (ClickHouse UInt64 for IDs)
# - str → Annotated[str, "LowCardinality"] (dictionary encoding for low-cardinality fields)
# - Remove SQLAlchemy relationships (denormalized structure)
# - Remove ORM features (table=True, unique, index)
# ══════════════════════════════════════════════════════════════

class Customer(CustomerBase, CdcOlapModelBase):
    """
    Customer OLAP model.

    Inherits: CustomerBase (business fields) + CdcOlapModelBase (CDC fields + None handling)
    """
    id: Annotated[int, "uint64"]
    # Inherited: email, name, country, city, createdAt (auto None→default conversion)

class Product(ProductBase, CdcOlapModelBase):
    """
    Product OLAP model.

    LowCardinality: Dictionary encoding for low-cardinality strings (categories, status).
    Reduces storage and improves query performance.
    """
    id: Annotated[int, "uint64"]
    category: Annotated[str, "LowCardinality"]
    # Inherited: name, price, createdAt (auto None→default conversion)


class Order(OrderBase, CdcOlapModelBase):
    """Order OLAP model."""
    id: Annotated[int, "uint64"]
    status: Annotated[str, "LowCardinality"]
    # Inherited: customerId, orderDate, total (auto None→default conversion)


class OrderItem(OrderItemBase, CdcOlapModelBase):
    """
    OrderItem OLAP model.

    Note: uint8 for quantity (0-255). Use uint16/uint32 if quantities exceed 255.
    """
    id: int
    quantity: Annotated[int, "uint8"]
    # Inherited: orderId, productId, price (auto None→default conversion)



## TO-DO: DENORMALIZED FACT TABLE FOR ALL ORDER ITEMS AND ORDERS
## THIS IS A WORK IN PROGRESS. IT WILL BE THE TABLE THAT WE WILL CREATE FOR THE ANALYTICAL QUERIES WE WILL RUN ON THE DATA.

## ANALYTICAL QUERIES WE WILL RUN ON THE DATA:
## SUMMARY METRICS:
## 1. TOTAL REVENUE
## 2. TOTAL ORDERS
## 3. TOTAL CUSTOMERS
## 4. TOTAL ITEMS SOLD
## 5. AVERAGE ORDER VALUE
## 6. AVERGAE REVENUE PER ORDER, CUSTOMER
## 7. TIME SERIES: REVENUE PER DAY, WEEK, MONTH, YEAR
## FILTER AND GROUP BY: PER PRODUCT, CUSTOMER, COUNTRY, STATE, ORDER STATUS, ORDER DATE, ORDER ID

class OrderFact(OrderItemBase, OrderBase, CdcOlapModelBase):
    pass