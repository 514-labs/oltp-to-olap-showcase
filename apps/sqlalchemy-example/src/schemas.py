"""
Pydantic schemas backing the FastAPI endpoints.

These models mirror the SQLAlchemy entities while adding request/response
shapes used by the REST API.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class ApiResponse(BaseModel):
    """Standard API response envelope."""

    success: bool
    data: Any | None = None


class BaseOrmModel(BaseModel):
    """Shared configuration for ORM-compatible schemas."""

    model_config = ConfigDict(from_attributes=True)


class CustomerBase(BaseOrmModel):
    email: str
    name: str
    country: str
    city: str


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseOrmModel):
    email: Optional[str] = None
    name: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None

    def model_dump(self, *args, **kwargs):
        kwargs.setdefault("exclude_unset", True)
        kwargs.setdefault("exclude_none", True)
        return super().model_dump(*args, **kwargs)


class Customer(CustomerBase):
    id: int
    created_at: datetime


class ProductBase(BaseOrmModel):
    name: str
    category: str
    price: Decimal


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseOrmModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[Decimal] = None

    def model_dump(self, *args, **kwargs):
        kwargs.setdefault("exclude_unset", True)
        kwargs.setdefault("exclude_none", True)
        return super().model_dump(*args, **kwargs)


class Product(ProductBase):
    id: int
    created_at: datetime


class OrderCreate(BaseOrmModel):
    customer_id: int
    total: Decimal
    order_date: Optional[datetime] = None
    status: Optional[str] = None


class OrderUpdate(BaseOrmModel):
    customer_id: Optional[int] = None
    order_date: Optional[datetime] = None
    status: Optional[str] = None
    total: Optional[Decimal] = None

    def model_dump(self, *args, **kwargs):
        kwargs.setdefault("exclude_unset", True)
        kwargs.setdefault("exclude_none", True)
        return super().model_dump(*args, **kwargs)


class Order(OrderCreate):
    id: int
    order_date: datetime
    status: str


class OrderItemBase(BaseOrmModel):
    order_id: int
    product_id: int
    quantity: int
    price: Decimal


class OrderItemCreate(OrderItemBase):
    pass


class OrderItemUpdate(BaseOrmModel):
    order_id: Optional[int] = None
    product_id: Optional[int] = None
    quantity: Optional[int] = None
    price: Optional[Decimal] = None

    def model_dump(self, *args, **kwargs):
        kwargs.setdefault("exclude_unset", True)
        kwargs.setdefault("exclude_none", True)
        return super().model_dump(*args, **kwargs)


class OrderItem(OrderItemBase):
    id: int
