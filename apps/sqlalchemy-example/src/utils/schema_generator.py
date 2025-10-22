"""
Automatic Pydantic schema generation from SQLAlchemy models

Usage:
    from src.utils.schema_generator import generate_schemas
    from src.models.customer import Customer

    CustomerCreate, CustomerRead = generate_schemas(Customer)
"""

from typing import Type, Optional, Set, Tuple, Any
from pydantic import BaseModel, create_model, Field
from sqlalchemy import Integer, String, DateTime, Numeric, Boolean, Float
from sqlalchemy.orm import DeclarativeMeta
from sqlalchemy.inspection import inspect
from datetime import datetime
from decimal import Decimal


def sqlalchemy_to_pydantic(
    db_model: Type[DeclarativeMeta],
    *,
    name: Optional[str] = None,
    exclude: Optional[Set[str]] = None,
    include: Optional[Set[str]] = None,
    optional_fields: Optional[Set[str]] = None,
) -> Type[BaseModel]:
    """
    Convert a SQLAlchemy model to a Pydantic model.

    Args:
        db_model: SQLAlchemy model class
        name: Name for the generated Pydantic model (default: {ModelName}Schema)
        exclude: Set of field names to exclude
        include: Set of field names to include (if set, only these are included)
        optional_fields: Set of field names to make Optional (nullable)

    Returns:
        Dynamically created Pydantic model class

    Example:
        ```python
        from src.models.customer import Customer

        # Generate full schema
        CustomerSchema = sqlalchemy_to_pydantic(Customer)

        # Generate CREATE schema (no id, no created_at)
        CustomerCreate = sqlalchemy_to_pydantic(
            Customer,
            name="CustomerCreate",
            exclude={"id", "created_at", "orders"}
        )

        # Generate READ schema (include id, exclude relationships)
        CustomerRead = sqlalchemy_to_pydantic(
            Customer,
            name="CustomerRead",
            exclude={"orders"}
        )
        ```
    """
    exclude = exclude or set()
    optional_fields = optional_fields or set()
    mapper = inspect(db_model)

    fields = {}
    for column in mapper.columns:
        if column.name in exclude:
            continue
        if include and column.name not in include:
            continue

        # Map SQLAlchemy types to Python types
        python_type = _map_sqlalchemy_type_to_python(column.type)

        # Handle nullable columns or explicitly optional fields
        if column.nullable or column.name in optional_fields:
            python_type = Optional[python_type]
            default = None
        else:
            default = ...  # Required field

        # Add validation constraints
        field_kwargs = {}
        if isinstance(column.type, String) and column.type.length:
            field_kwargs['max_length'] = column.type.length
        if isinstance(column.type, Numeric):
            if column.type.scale:
                field_kwargs['decimal_places'] = column.type.scale
            field_kwargs['ge'] = 0  # Assume non-negative for money fields

        if field_kwargs:
            fields[column.name] = (python_type, Field(default=default, **field_kwargs))
        else:
            fields[column.name] = (python_type, default)

    # Pydantic v2 config for ORM compatibility
    from pydantic import ConfigDict

    config = ConfigDict(
        from_attributes=True,  # Allows reading from SQLAlchemy models
        arbitrary_types_allowed=True
    )

    # Dynamically create the model
    model_name = name or f"{db_model.__name__}Schema"
    return create_model(
        model_name,
        __config__=config,
        **fields
    )


def _map_sqlalchemy_type_to_python(column_type: Any) -> Type:
    """
    Map SQLAlchemy column types to Python types.

    Args:
        column_type: SQLAlchemy column type instance

    Returns:
        Corresponding Python type
    """
    # Check instance types (more specific first)
    if isinstance(column_type, Integer):
        return int
    elif isinstance(column_type, String):
        return str
    elif isinstance(column_type, DateTime):
        return datetime
    elif isinstance(column_type, Numeric):
        return Decimal
    elif isinstance(column_type, Float):
        return float
    elif isinstance(column_type, Boolean):
        return bool

    # Default fallback
    return str


def generate_schemas(
    db_model: Type[DeclarativeMeta],
    *,
    exclude_relationships: bool = True,
) -> Tuple[Type[BaseModel], Type[BaseModel]]:
    """
    Generate both CREATE and READ Pydantic schemas from a SQLAlchemy model.

    This is a convenience function that generates two common schema patterns:
    - CREATE: Excludes id, timestamps, and relationships (for POST requests)
    - READ: Includes id and timestamps, excludes relationships (for responses)

    Args:
        db_model: SQLAlchemy model class
        exclude_relationships: Whether to exclude relationship fields (default: True)

    Returns:
        Tuple of (CreateSchema, ReadSchema)

    Example:
        ```python
        from src.models.customer import Customer

        CustomerCreate, CustomerRead = generate_schemas(Customer)

        @app.post("/customers", response_model=CustomerRead)
        def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
            db_customer = Customer(**customer.dict())
            db.add(db_customer)
            db.commit()
            db.refresh(db_customer)
            return db_customer
        ```
    """
    # Find relationship and auto-generated fields to exclude
    mapper = inspect(db_model)
    exclude_fields = set()

    if exclude_relationships:
        # Exclude relationship attributes
        for relationship in mapper.relationships:
            exclude_fields.add(relationship.key)

    # Fields typically auto-generated (exclude from CREATE)
    auto_fields = {"id", "created_at", "updated_at"}

    # CREATE schema: no auto-generated fields, no relationships
    create_schema = sqlalchemy_to_pydantic(
        db_model,
        name=f"{db_model.__name__}Create",
        exclude=exclude_fields | auto_fields,
    )

    # READ schema: include auto-generated fields, exclude relationships
    read_schema = sqlalchemy_to_pydantic(
        db_model,
        name=f"{db_model.__name__}Read",
        exclude=exclude_fields,
    )

    return create_schema, read_schema


# Example usage and testing
if __name__ == "__main__":
    import sys
    sys.path.append("../..")

    from src.models.customer import Customer
    from src.models.product import Product

    print("=== Generating schemas for Customer ===")
    CustomerCreate, CustomerRead = generate_schemas(Customer)

    print(f"\nCustomerCreate fields:")
    for field_name, field_info in CustomerCreate.model_fields.items():
        required = "required" if field_info.is_required() else "optional"
        print(f"  - {field_name}: {field_info.annotation} ({required})")

    print(f"\nCustomerRead fields:")
    for field_name, field_info in CustomerRead.model_fields.items():
        required = "required" if field_info.is_required() else "optional"
        print(f"  - {field_name}: {field_info.annotation} ({required})")

    print("\n=== Generating schemas for Product ===")
    ProductCreate, ProductRead = generate_schemas(Product)

    print(f"\nProductCreate fields:")
    for field_name, field_info in ProductCreate.model_fields.items():
        required = "required" if field_info.is_required() else "optional"
        print(f"  - {field_name}: {field_info.annotation} ({required})")

    print("\n=== JSON Schema for CustomerCreate ===")
    import json
    print(json.dumps(CustomerCreate.model_json_schema(), indent=2))
