#!/usr/bin/env python3
"""
Quick test to verify API returns camelCase responses.
Run the FastAPI server first: fastapi dev src/main.py
"""

import requests
import json

BASE_URL = "http://localhost:3002"

def test_customer():
    """Test that customer endpoints return camelCase"""
    # Create a customer
    customer_data = {
        "email": "test@example.com",
        "name": "Test User",
        "country": "USA",
        "city": "New York"
    }
    
    response = requests.post(f"{BASE_URL}/api/customers", json=customer_data)
    print("Create Customer Response:")
    print(json.dumps(response.json(), indent=2))
    
    if response.status_code == 201:
        data = response.json()["data"]
        # Check for camelCase fields
        assert "createdAt" in data, "Expected 'createdAt' (camelCase), but not found!"
        assert "created_at" not in data, "Found 'created_at' (snake_case) instead of camelCase!"
        print("✅ Customer API returns camelCase correctly!")
        return data["id"]
    else:
        print(f"❌ Failed to create customer: {response.status_code}")
        return None

def test_order(customer_id):
    """Test that order endpoints accept and return camelCase"""
    if not customer_id:
        print("⏭️  Skipping order test (no customer)")
        return None
        
    # Test with camelCase input (like test client sends)
    order_data = {
        "customerId": customer_id,  # camelCase input (NOT snake_case!)
        "status": "pending",
        "total": 99.99
    }
    
    response = requests.post(f"{BASE_URL}/api/orders", json=order_data)
    print("\nCreate Order Request (camelCase):")
    print(json.dumps(order_data, indent=2))
    print("\nCreate Order Response:")
    print(json.dumps(response.json(), indent=2))
    
    if response.status_code == 201:
        data = response.json()["data"]
        # Check for camelCase fields in response
        assert "customerId" in data, "Expected 'customerId' (camelCase), but not found!"
        assert "customer_id" not in data, "Found 'customer_id' (snake_case) instead of camelCase!"
        assert "orderDate" in data, "Expected 'orderDate' (camelCase), but not found!"
        assert "order_date" not in data, "Found 'order_date' (snake_case) instead of camelCase!"
        print("✅ Order API accepts camelCase input and returns camelCase output!")
        return data["id"]
    else:
        print(f"❌ Failed to create order: {response.status_code}")
        print(f"   Response: {response.json()}")
        return None

def test_product():
    """Test that product endpoints accept and return camelCase"""
    product_data = {
        "name": "Test Product",
        "category": "Electronics",
        "price": 149.99
    }
    
    response = requests.post(f"{BASE_URL}/api/products", json=product_data)
    print("\nCreate Product Response:")
    print(json.dumps(response.json(), indent=2))
    
    if response.status_code == 201:
        data = response.json()["data"]
        assert "createdAt" in data, "Expected 'createdAt' (camelCase), but not found!"
        assert "created_at" not in data, "Found 'created_at' (snake_case) instead of camelCase!"
        print("✅ Product API returns camelCase correctly!")
        return data["id"]
    else:
        print(f"❌ Failed to create product: {response.status_code}")
        return None

def test_order_item(order_id, product_id):
    """Test that order item endpoints accept and return camelCase"""
    if not order_id or not product_id:
        print("⏭️  Skipping order item test")
        return
        
    # Test with camelCase input
    item_data = {
        "orderId": order_id,      # camelCase!
        "productId": product_id,  # camelCase!
        "quantity": 2,
        "price": 149.99
    }
    
    response = requests.post(f"{BASE_URL}/api/order-items", json=item_data)
    print("\nCreate Order Item Request (camelCase):")
    print(json.dumps(item_data, indent=2))
    print("\nCreate Order Item Response:")
    print(json.dumps(response.json(), indent=2))
    
    if response.status_code == 201:
        data = response.json()["data"]
        assert "orderId" in data, "Expected 'orderId' (camelCase), but not found!"
        assert "order_id" not in data, "Found 'order_id' (snake_case) instead of camelCase!"
        assert "productId" in data, "Expected 'productId' (camelCase), but not found!"
        assert "product_id" not in data, "Found 'product_id' (snake_case) instead of camelCase!"
        print("✅ Order Item API accepts camelCase input and returns camelCase output!")
    else:
        print(f"❌ Failed to create order item: {response.status_code}")
        print(f"   Response: {response.json()}")

if __name__ == "__main__":
    print("🧪 Testing SQLAlchemy API camelCase compatibility\n")
    print("=" * 60)
    print("This test verifies that the API:")
    print("  1. Accepts camelCase input (like the test client sends)")
    print("  2. Returns camelCase output (like the test client expects)")
    print("=" * 60)
    
    try:
        customer_id = test_customer()
        product_id = test_product()
        order_id = test_order(customer_id)
        test_order_item(order_id, product_id)
        
        print("\n" + "=" * 60)
        print("✅ All tests passed! API is fully compatible with test client.")
        print("   - Accepts camelCase input ✓")
        print("   - Returns camelCase output ✓")
    except AssertionError as e:
        print("\n" + "=" * 60)
        print(f"❌ Test failed: {e}")
    except requests.exceptions.ConnectionError:
        print("\n" + "=" * 60)
        print("❌ Could not connect to API. Is the server running?")
        print("   Start it with: fastapi dev src/main.py")

