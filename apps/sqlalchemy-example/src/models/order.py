"""
Order Model (Dimension Table in OLAP)
"""

from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class Order(Base):
    """
    Order entity representing customer purchases.

    OLAP Mapping: Dimension Table (dim_order)
    - Remove relationships
    - Keep foreign keys as UInt64
    - Convert timestamps properly
    """
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    order_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="pending")
    total = Column(Numeric(10, 2), nullable=False)

    # Relationships (removed in OLAP)
    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Order(id={self.id}, customer_id={self.customer_id}, status={self.status}, total={self.total})>"
