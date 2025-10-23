"""
Order Model (Dimension Table in OLAP)
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .base import Base

if TYPE_CHECKING:  # pragma: no cover
    from .customer import Customer
    from .order_item import OrderItem


class Order(Base):
    """
    Order entity representing customer purchases.

    OLAP Mapping: Dimension Table (dim_order)
    - Remove relationships
    - Keep foreign keys as UInt64
    - Convert timestamps properly
    """

    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False, index=True)
    order_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    # Relationships (removed in OLAP)
    customer: Mapped["Customer"] = relationship("Customer", back_populates="orders")  # type: ignore
    items: Mapped[List["OrderItem"]] = relationship(  # type: ignore
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Order(id={self.id}, customer_id={self.customer_id}, status={self.status}, total={self.total})>"
