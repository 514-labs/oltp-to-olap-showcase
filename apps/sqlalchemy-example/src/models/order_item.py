"""
OrderItem Model (Fact Table in OLAP)
"""

from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:  # pragma: no cover
    from .order import Order
    from .product import Product


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

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)  # Unit price at time of purchase

    # Relationships (removed in OLAP)
    order: Mapped["Order"] = relationship("Order", back_populates="items")  # type: ignore
    product: Mapped["Product"] = relationship("Product", back_populates="order_items")  # type: ignore

    def __repr__(self) -> str:
        return (
            f"<OrderItem(id={self.id}, order_id={self.order_id}, "
            f"product_id={self.product_id}, qty={self.quantity})>"
        )
