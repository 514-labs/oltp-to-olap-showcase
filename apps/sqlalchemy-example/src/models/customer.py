"""
Customer Model (Dimension Table in OLAP)
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .base import Base

if TYPE_CHECKING:  # pragma: no cover
    from .order import Order


class Customer(Base):
    """
    Customer entity representing users who place orders.

    OLAP Mapping: Dimension Table (dim_customer)
    - Remove relationships
    - Convert id to UInt64
    """

    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships (removed in OLAP)
    orders: Mapped[List["Order"]] = relationship(  # type: ignore
        "Order",
        back_populates="customer",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Customer(id={self.id}, email={self.email}, name={self.name})>"
