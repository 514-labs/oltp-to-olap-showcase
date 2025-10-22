"""
SQLAlchemy ORM Models for OLTP Database

These models define the transactional database schema for an e-commerce system.
They will be converted to OLAP tables for analytics in ClickHouse via CDC.
"""

from .customer import Customer
from .product import Product
from .order import Order
from .order_item import OrderItem
from .base import Base

__all__ = ["Base", "Customer", "Product", "Order", "OrderItem"]
