# Type Alignment: TypeScript ↔ FastAPI

This document shows how TypeScript types in the test client align with FastAPI/Pydantic schemas.

## Field Name Conversion

All fields are automatically converted from Python `snake_case` to TypeScript `camelCase`:

| Python Field  | TypeScript Field | Conversion |
| ------------- | ---------------- | ---------- |
| `customer_id` | `customerId`     | ✓          |
| `order_date`  | `orderDate`      | ✓          |
| `created_at`  | `createdAt`      | ✓          |
| `product_id`  | `productId`      | ✓          |
| `order_id`    | `orderId`        | ✓          |

## Type Mappings

### Customer

**TypeScript** (`apps/test-client/src/lib/types.ts`):

```typescript
export interface Customer {
  id: number;
  email: string;
  name: string;
  country: string;
  city: string;
  createdAt: string; // ISO datetime string
  orders?: Order[]; // Optional relationship
}
```

**Python Schema** (`src/schemas.py`):

```python
class Customer(CustomerBase):
    id: int
    created_at: datetime                        # → createdAt
    orders: Optional[List["Order"]] = None      # → orders?
```

**API Response**:

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "country": "USA",
  "city": "New York",
  "createdAt": "2025-10-23T10:00:00Z",
  "orders": []
}
```

### Product

**TypeScript**:

```typescript
export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  createdAt: string;
}
```

**Python Schema**:

```python
class Product(ProductBase):
    id: int
    created_at: datetime                        # → createdAt
    # Python Decimal is serialized as JSON number
```

**API Response**:

```json
{
  "id": 1,
  "name": "Laptop",
  "category": "Electronics",
  "price": 999.99,
  "createdAt": "2025-10-23T10:00:00Z"
}
```

### Order

**TypeScript**:

```typescript
export interface Order {
  id: number;
  customerId: number;
  orderDate: string;
  status: string;
  total: number;
  customer?: Customer; // Optional relationship
  items?: OrderItem[]; // Optional relationship (USED BY TEST CLIENT)
}
```

**Python Schema**:

```python
class Order(BaseOrmModel):
    id: int
    customer_id: int                            # → customerId
    order_date: datetime                        # → orderDate
    status: str
    total: Decimal                              # → number in JSON
    customer: Optional["Customer"] = None       # → customer?
    items: Optional[List["OrderItem"]] = None   # → items? (IMPORTANT!)
```

**API Response**:

```json
{
  "id": 1,
  "customerId": 1,
  "orderDate": "2025-10-23T10:00:00Z",
  "status": "pending",
  "total": 299.99,
  "items": [
    {
      "id": 1,
      "orderId": 1,
      "productId": 5,
      "quantity": 2,
      "price": 149.99
    }
  ]
}
```

### OrderItem

**TypeScript**:

```typescript
export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  order?: Order;
  product?: Product;
}
```

**Python Schema**:

```python
class OrderItem(OrderItemBase):
    id: int
    order_id: int                               # → orderId
    product_id: int                             # → productId
    order: Optional["Order"] = None             # → order?
    product: Optional["Product"] = None         # → product?
```

**API Response**:

```json
{
  "id": 1,
  "orderId": 1,
  "productId": 5,
  "quantity": 2,
  "price": 149.99
}
```

## Input Types

### CustomerInput

**TypeScript**:

```typescript
export interface CustomerInput {
  email: string;
  name: string;
  country: string;
  city: string;
}
```

**Python Schema**:

```python
class CustomerCreate(CustomerBase):
    # Accepts both camelCase and snake_case
    # email, name, country, city
```

**Request (accepts both)**:

```json
// ✅ camelCase (preferred)
{
  "email": "user@example.com",
  "name": "John Doe",
  "country": "USA",
  "city": "New York"
}

// ✅ snake_case (also works)
{
  "email": "user@example.com",
  "name": "John Doe",
  "country": "USA",
  "city": "New York"
}
```

### OrderInput

**TypeScript**:

```typescript
export interface OrderInput {
  customerId: number;
  status: string;
  total: number;
}
```

**Python Schema**:

```python
class OrderCreate(BaseOrmModel):
    customer_id: int                # Accepts customerId or customer_id
    status: Optional[str]
    total: Decimal
```

**Request**:

```json
{
  "customerId": 1,
  "status": "pending",
  "total": 299.99
}
```

### OrderItemInput

**TypeScript**:

```typescript
export interface OrderItemInput {
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
}
```

**Python Schema**:

```python
class OrderItemCreate(OrderItemBase):
    order_id: int           # Accepts orderId or order_id
    product_id: int         # Accepts productId or product_id
    quantity: int
    price: Decimal
```

**Request**:

```json
{
  "orderId": 1,
  "productId": 5,
  "quantity": 2,
  "price": 149.99
}
```

## Special Considerations

### 1. Relationships

The test client expects `order.items` to be populated. The API uses SQLAlchemy's `selectinload` to eagerly load relationships:

```python
@app.get("/api/orders")
def get_orders(db: Session = Depends(get_db)):
    orders = db.query(Order).options(
        selectinload(Order.items),      # ← Load items
        selectinload(Order.customer)
    ).all()
    return {"success": True, "data": [schemas.Order.model_validate(o).model_dump(by_alias=True) for o in orders]}
```

### 2. Decimal vs Number

Python uses `Decimal` for precise monetary values, but JSON serializes them as `number`:

```python
total: Decimal = Field(..., ge=0, decimal_places=2)  # Python
```

```typescript
total: number; // TypeScript
```

```json
{ "total": 299.99 } // JSON (number)
```

### 3. DateTime Serialization

Python `datetime` is serialized as ISO 8601 string:

```python
created_at: datetime  # Python
```

```typescript
createdAt: string; // TypeScript (ISO 8601)
```

```json
{ "createdAt": "2025-10-23T10:00:00Z" }
```

## Verification

Run the test suite to verify alignment:

```bash
# Start API
fastapi dev src/main.py

# Test camelCase compatibility
python test_camelcase.py

# Test with actual frontend
cd ../test-client
pnpm dev
```

## Summary

✅ **All TypeScript types align with FastAPI schemas**

- Field names: snake_case → camelCase ✓
- Type mappings: Compatible ✓
- Relationships: Loaded correctly ✓
- Input formats: Accepts both naming styles ✓
- Output format: Always camelCase ✓
