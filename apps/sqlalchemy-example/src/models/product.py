"""
Product Model (Dimension Table in OLAP)
"""

from sqlalchemy import Column, Integer, String, Numeric, DateTime
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from .base import Base
from pydantic import BaseModel
from datetime import datetime
from typing import List
from .order_item import OrderItem

class Product(Base):
    """
    Product entity representing items available for purchase.

    OLAP Mapping: Dimension Table (dim_product)
    - Remove relationships
    - Convert id to UInt64
    - Convert price to Float64
    """
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships (removed in OLAP)
    order_items: Mapped[List[OrderItem]] = relationship("OrderItem", back_populates="product")  # type: ignore

    def __repr__(self) -> str:
        return f"<Product(id={self.id}, name={self.name}, category={self.category}, price={self.price})>"
