"""
OrderItem Model (Fact Table in OLAP)
"""

from sqlalchemy import Column, Integer, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base


class OrderItem(Base):
    """
    OrderItem entity representing individual line items in an order.

    OLAP Mapping: Fact Table (fact_order_item)
    - This is the grain of our fact table
    - Remove relationships
    - Convert all IDs to UInt64
    - Will be enriched with dimension attributes via dictionaries
    """
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)  # Unit price at time of purchase

    # Relationships (removed in OLAP)
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

    def __repr__(self) -> str:
        return f"<OrderItem(id={self.id}, order_id={self.order_id}, product_id={self.product_id}, qty={self.quantity})>"
