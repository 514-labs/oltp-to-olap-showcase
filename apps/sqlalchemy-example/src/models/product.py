"""
Product Model (Dimension Table in OLAP)
"""

from sqlalchemy import Column, Integer, String, Numeric, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class Product(Base):
    """
    Product entity representing items available for purchase.

    OLAP Mapping: Dimension Table (dim_product)
    - Remove relationships
    - Convert id to UInt64
    - Convert price to Float64
    """
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False, index=True)
    price = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships (removed in OLAP)
    order_items = relationship("OrderItem", back_populates="product")

    def __repr__(self) -> str:
        return f"<Product(id={self.id}, name={self.name}, category={self.category}, price={self.price})>"
