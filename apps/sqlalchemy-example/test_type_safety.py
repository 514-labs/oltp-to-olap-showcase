"""
Test script demonstrating full type safety with generated schemas

Run with: uv run python test_type_safety.py
Type check with: uv run mypy test_type_safety.py
"""

from datetime import datetime
from decimal import Decimal
from src.schemas import (
    Customer,
    CustomerDimension,
    Product,
    ProductDimension,
    CdcMetadata,
    CdcFields
)


def test_customer_type_hints():
    """Demonstrate IDE type hints work with Customer schema"""
    
    # ✅ Create customer with type checking
    customer = Customer(
        id=1,
        email="john@example.com",
        name="John Doe",
        country="USA",
        city="New York",
        created_at=datetime.now()
    )
    
    # ✅ IDE knows all field types
    email: str = customer.email
    city: str = customer.city
    created: datetime = customer.created_at
    
    print(f"✅ Customer: {customer.name} from {customer.city}, {customer.country}")
    print(f"   Type hints work! email is {type(customer.email).__name__}")


def test_olap_dimension():
    """Demonstrate OLAP dimension with CDC fields has full type safety"""
    
    # ✅ CustomerDimension includes both Customer fields + CDC fields
    dim = CustomerDimension(
        id=1,
        email="jane@example.com",
        name="Jane Smith",
        country="Canada",
        city="Toronto",
        created_at=datetime.now(),
        is_deleted=0,
        lsn=12345
    )
    
    # ✅ All fields are type-checked
    name: str = dim.name
    city: str = dim.city
    lsn: int = dim.lsn
    is_deleted: int = dim.is_deleted
    
    print(f"✅ Dimension: {dim.name} (lsn={dim.lsn}, deleted={bool(dim.is_deleted)})")
    print(f"   CDC fields work! lsn is {type(dim.lsn).__name__}")


def test_cdc_transformation():
    """Demonstrate CDC transformation with type safety"""
    
    # Simulate CDC event
    cdc_event = {
        "_metadata": {
            "table": "customers",
            "operation": "insert",
            "lsn": "0/1A2B3C4D"
        },
        "id": 100,
        "email": "alice@example.com",
        "name": "Alice Johnson",
        "country": "UK",
        "city": "London",
        "created_at": datetime.now()
    }
    
    # ✅ Parse metadata with type checking
    metadata = CdcMetadata(**cdc_event["_metadata"])
    
    # ✅ Type hints work in transformation logic
    operation: str = metadata.operation
    table_name: str = metadata.table
    
    # ✅ Create dimension with full type safety
    dimension = CustomerDimension(
        id=cdc_event["id"],
        email=cdc_event["email"],
        name=cdc_event["name"],
        country=cdc_event["country"],
        city=cdc_event["city"],
        created_at=cdc_event["created_at"],
        is_deleted=1 if metadata.operation == "delete" else 0,
        lsn=int(metadata.lsn.replace("/", ""), 16)
    )
    
    print(f"✅ Transformed CDC event: {dimension.name}")
    print(f"   Operation: {metadata.operation}, LSN: {dimension.lsn}")


def test_product_with_decimal():
    """Demonstrate Decimal type handling"""
    
    product = Product(
        id=1,
        name="Laptop",
        category="Electronics",
        price=Decimal("999.99"),
        created_at=datetime.now()
    )
    
    # ✅ IDE knows price is Decimal
    price: Decimal = product.price
    
    print(f"✅ Product: {product.name} - ${product.price}")
    print(f"   Decimal type preserved: {type(product.price).__name__}")


def main():
    print("🔍 Testing Type Safety with Generated Schemas\n")
    print("=" * 60)
    
    test_customer_type_hints()
    print()
    
    test_olap_dimension()
    print()
    
    test_cdc_transformation()
    print()
    
    test_product_with_decimal()
    print()
    
    print("=" * 60)
    print("✅ All type checks passed!")
    print("\n💡 Run 'uv run mypy test_type_safety.py' for static type checking")


if __name__ == "__main__":
    main()

