"""
Customer model defined using SQLModel (combines SQLAlchemy + Pydantic).
"""
from datetime import datetime
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel
from decimal import Decimal

class CustomerBase(SQLModel):
    email: str = Field(
        unique=True, nullable=False, index=True, max_length=255
    )
    name: str = Field(min_length=1, max_length=255, nullable=False)
    country: str = Field(min_length=1, max_length=100, nullable=False)
    city: str = Field(min_length=1, max_length=100, nullable=False)

class Customer(CustomerBase, table=True):
    """Customer entity representing users who place orders."""
    id: Optional[int] = Field(default=None, primary_key=True)
    createdAt: Optional[datetime] = Field(default=datetime.now())

    # Relationships
    orders: list["Order"] = Relationship(
        back_populates="customer",
        cascade_delete=True
    )

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"<Customer(id={self.id}, email={self.email}, name={self.name})>"


class CustomerInsert(CustomerBase):
    pass


class ProductBase(SQLModel):
    name: str = Field(min_length=1, max_length=255, nullable=False)
    category: str = Field(min_length=1, max_length=100, nullable=False, index=True)
    price: Decimal = Field(gt=0, decimal_places=2, nullable=False)

class Product(ProductBase, table=True):
    """Product entity representing items available for purchase."""
    id: Optional[int] = Field(default=None, primary_key=True)
    createdAt: Optional[datetime] = Field(default=datetime.now())

    # Relationships
    orderItems: list["OrderItem"] = Relationship(back_populates="product")

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"<Product(id={self.id}, name={self.name}, category={self.category}, price={self.price})>"   

class ProductInsert(ProductBase):
    pass


class OrderBase(SQLModel):
    customerId: int = Field(default=None, foreign_key="customer.id", index=True)
    orderDate: Optional[datetime] = Field(
        default=datetime.now(), nullable=False)
    total: Decimal = Field(gt=0, decimal_places=2, nullable=False)

class Order(OrderBase, table=True):
    """Order entity representing customer purchases."""

    id: Optional[int] = Field(default=None, primary_key=True)
    status: str = Field(default="pending", max_length=50, nullable=False)

    # Relationships
    customer: Customer | None = Relationship(back_populates="orders")
    items: list["OrderItem"] = Relationship(
        back_populates="order",
        cascade_delete=True
    )

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return (
            f"<Order(id={self.id}, customerId={self.customerId}, "
            f"status={self.status}, total={self.total})>"
        )


class OrderInsert(OrderBase):
    pass


"""
Order item model defined using SQLModel.
"""

class OrderItemBase(SQLModel):
    orderId: int = Field(default=None, foreign_key="order.id", index=True)
    productId: int = Field(default=None, foreign_key="product.id", index=True)
    quantity: int = Field(gt=0, nullable=False)
    price: Decimal = Field(gt=0, decimal_places=2, nullable=False)

class OrderItem(OrderItemBase, table=True):
    """OrderItem entity representing individual line items in an order."""
    id: Optional[int] = Field(default=None, primary_key=True)

    # Relationships
    order: Order | None = Relationship(back_populates="items")
    product: Product | None = Relationship(back_populates="orderItems")

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return (
            f"<OrderItem(id={self.id}, orderId={self.orderId}, "
            f"product_id={self.productId}, qty={self.quantity})>"
        )

class OrderItemInsert(OrderItemBase):
    pass