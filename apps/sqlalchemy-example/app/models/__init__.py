"""
OLAP Type Definitions Converted from SQLAlchemy Models

These Pydantic models represent the OLAP schema for ClickHouse,
converted from SQLAlchemy OLTP models.

Conversion Rules:
- Remove relationships (orders, items, customer, product)
- Convert Integer → int (UInt64 for ClickHouse)
- Convert Numeric/Decimal → float
- Convert DateTime → datetime
- Add CDC metadata fields (is_deleted, lsn)
"""

from datetime import datetime
from typing import Literal, Annotated, TypeVar, Generic
from pydantic import BaseModel
from moose_lib import Key

# ==================== CDC METADATA ====================

class RedpandaPgCdcMetadata(BaseModel):
    """CDC event metadata from Redpanda Connect"""
    table: str
    operation: Literal['delete', 'insert', 'update', 'read']
    lsn: str  # PostgreSQL LSN as hex string


# Generic type variable for table data models
T = TypeVar('T', bound=BaseModel)


class RedpandaPgCdcPayload(BaseModel, Generic[T]):
    """
    Generic CDC event payload structure from Redpanda Connect
    
    Type parameter T represents the specific table model (Customer, Product, etc.)
    
    Structure:
    - _metadata: CDC metadata (table, operation, lsn)
    - All fields from type T (the actual table data)
    
    Example:
        RedpandaPgCdcPayload[CustomerDimension] for customer CDC events
    """
    model_config = {"extra": "allow"}  # Allow additional fields from table data
    
    _metadata: RedpandaPgCdcMetadata


class CdcFields(BaseModel):
    """CDC metadata fields added to all OLAP tables"""
    is_deleted: Annotated[int, "uint8"]  # UInt8: 0 = active, 1 = deleted
    lsn: int  # UInt64: PostgreSQL log sequence number


# ==================== DIMENSION TABLES ====================

class CustomerDimension(CdcFields, BaseModel):
    """Customer Dimension - Converted from SQLAlchemy Customer model"""
    id: int
    email: str
    name: str
    country: str
    city: str
    created_at: datetime


class ProductDimension(CdcFields, BaseModel):
    """Product Dimension - Converted from SQLAlchemy Product model"""
    id: int 
    name: str
    category: str
    price: float
    created_at: datetime


class OrderDimension(CdcFields, BaseModel):
    """Order Dimension - Converted from SQLAlchemy Order model"""
    id: int
    customer_id: int
    order_date: datetime
    status: str
    total: float


class OrderItemFact(CdcFields, BaseModel):
    """OrderItem Fact - Converted from SQLAlchemy OrderItem model"""
    id: int
    order_id: int
    product_id: int
    quantity: int
    price: float


# ==================== ENRICHED FACT TABLE ====================

class OrderFact(CdcFields, BaseModel):
    """
    Order Fact Enriched
    Denormalized fact table with dimension attributes
    
    Created by joining OrderItem with dimension tables via dictionaries:
    - Customer attributes (country, city)
    - Product attributes (category, name)
    - Order attributes (date, status)
    """
    id: int  # OrderItem ID
    order_id: int
    product_id: int
    customer_id: int
    
    # Time dimension
    order_date: datetime
    
    # Measures
    quantity: int
    unit_price: float
    revenue: float  # Calculated: quantity * unit_price
    
    # Denormalized attributes from dimensions
    order_status: str  # From Order
    customer_country: str  # From Customer
    customer_city: str  # From Customer
    product_category: str  # From Product
    product_name: str  # From Product

