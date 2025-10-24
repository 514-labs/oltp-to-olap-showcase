# SQLAlchemy to OLAP Conversion Guide

Complete guide for converting SQLAlchemy ORM models to Moose OLAP tables.

## 🎯 Core Principles

### 1. Remove Relationships
SQLAlchemy relationships (`relationship()`, `back_populates`) don't exist in OLAP. They're replaced by:
- Foreign key columns (as UInt64)
- Denormalization (embedding attributes)
- Dictionary lookups (for enrichment)

### 2. Convert Types
Map SQLAlchemy column types to ClickHouse-optimized types:

| SQLAlchemy | ClickHouse | Reason |
|------------|------------|--------|
| `Integer` | `UInt64` | Unsigned, larger range, better compression |
| `String(N)` | `String` | Variable length |
| `Numeric(10,2)` | `Float64` | Faster arithmetic, acceptable precision loss |
| `DateTime(timezone=True)` | `DateTime` | UTC timestamps |
| `Boolean` | `UInt8` | 0 or 1 |

### 3. Add CDC Fields
Every OLAP table needs CDC metadata:
- `is_deleted: UInt8` - Soft delete flag (0=active, 1=deleted)
- `lsn: UInt64` - Log Sequence Number for versioning

## 📋 Step-by-Step Conversion

### Example: Customer Dimension

#### Step 1: SQLAlchemy Model (OLTP)

```python
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    country = Column(String(100), nullable=False)
    city = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships (will be removed)
    orders = relationship("Order", back_populates="customer")
```

#### Step 2: Identify OLAP Type (Dimension)

**Is this a dimension or fact?**
- ✅ Dimension - Describes a business entity (customer, product, location)
- ❌ Fact - Measures business events (orders, sales, transactions)

Customer is a **dimension** because it describes entities with slowly-changing attributes.

#### Step 3: Create TypeScript Interface

```typescript
// app/models.ts
import { UInt64, UInt8 } from '@514labs/moose-lib';

export interface CustomerDimension {
  // Convert Integer → UInt64
  id: UInt64;

  // Keep strings as-is
  email: string;
  name: string;
  country: string;
  city: string;

  // Convert DateTime → Date
  created_at: Date;

  // Remove relationships
  // orders: removed
}

// CDC fields (added separately)
export interface CdcFields {
  is_deleted: UInt8;
  lsn: UInt64;
}
```

#### Step 4: Create OlapTable Definition

```typescript
// app/sinkTables.ts
import { OlapTable, ClickHouseEngines } from '@514labs/moose-lib';
import { CustomerDimension, CdcFields } from './models';

export const CustomerDimensionTable = new OlapTable<CustomerDimension & CdcFields>(
  'dim_customer',
  {
    orderByFields: ['id'],
    engine: ClickHouseEngines.ReplacingMergeTree,
    ver: 'lsn',           // Version column for deduplication
    isDeleted: 'is_deleted',  // Soft delete flag
  }
);
```

## 🔄 Complete Conversion Examples

### 1. Dimension Table: Product

**SQLAlchemy:**
```python
class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order_items = relationship("OrderItem", back_populates="product")
```

**Moose OLAP:**
```typescript
export interface ProductDimension {
  id: UInt64;                // Integer → UInt64
  name: string;              // String → String
  category: string;          // String → String
  price: number;             // Numeric(10,2) → Float64
  created_at: Date;          // DateTime → Date
  // Removed: order_items
}

export const ProductDimensionTable = new OlapTable<ProductDimension & CdcFields>(
  'dim_product',
  {
    orderByFields: ['id'],
    engine: ClickHouseEngines.ReplacingMergeTree,
    ver: 'lsn',
    isDeleted: 'is_deleted',
  }
);
```

### 2. Dimension Table: Order

**SQLAlchemy:**
```python
class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    order_date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(50), nullable=False, default="pending")
    total = Column(Numeric(10, 2), nullable=False)

    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")
```

**Moose OLAP:**
```typescript
export interface OrderDimension {
  id: UInt64;
  customer_id: UInt64;       // ForeignKey → UInt64 (keep for joins)
  order_date: Date;
  status: string;
  total: number;             // Numeric → Float64
  // Removed: customer, items (relationships)
}

export const OrderDimensionTable = new OlapTable<OrderDimension & CdcFields>(
  'dim_order',
  {
    orderByFields: ['id'],
    engine: ClickHouseEngines.ReplacingMergeTree,
    ver: 'lsn',
    isDeleted: 'is_deleted',
  }
);
```

### 3. Fact Table: OrderItem

**SQLAlchemy:**
```python
class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")
```

**Moose OLAP:**
```typescript
export interface OrderItemFact {
  id: UInt64;
  order_id: UInt64;          // Keep foreign keys
  product_id: UInt64;
  quantity: number;          // Integer → Float64 (for ClickHouse math)
  price: number;             // Numeric → Float64 (unit price)
  // Removed: order, product (relationships)
}

export const OrderItemTable = new OlapTable<OrderItemFact & CdcFields>(
  'fact_order_item',
  {
    orderByFields: ['id', 'order_id', 'product_id'],
    engine: ClickHouseEngines.ReplacingMergeTree,
    ver: 'lsn',
    isDeleted: 'is_deleted',
  }
);
```

## 🎯 Conversion Checklist

### For Each Model:

- [ ] **Identify type**: Dimension or Fact?
- [ ] **Remove relationships**: `relationship()`, `back_populates`
- [ ] **Convert primary key**: `Integer` → `UInt64`
- [ ] **Convert foreign keys**: Keep as `UInt64` (for joins/dictionaries)
- [ ] **Convert numeric types**: `Numeric` → `Float64` (usually acceptable)
- [ ] **Convert timestamps**: `DateTime(timezone=True)` → `Date`
- [ ] **Add CDC fields**: `is_deleted`, `lsn`
- [ ] **Create OlapTable**: With proper engine and settings

### For Dimension Tables:

- [ ] Use `ReplacingMergeTree` engine
- [ ] Set `ver: 'lsn'` for automatic deduplication
- [ ] Set `isDeleted: 'is_deleted'` for soft deletes
- [ ] Order by primary key: `orderByFields: ['id']`

### For Fact Tables:

- [ ] Use `ReplacingMergeTree` engine
- [ ] Include foreign keys as `UInt64`
- [ ] Order by: `[id, ...foreign_keys]` for partition efficiency
- [ ] Consider pre-calculating measures (revenue = quantity * price)

## 🔧 Type Conversion Reference

### String Types

```python
# SQLAlchemy
Column(String(255))        # → string
Column(Text)               # → string
```

### Numeric Types

```python
# SQLAlchemy
Column(Integer)            # → UInt64 (unsigned, optimized)
Column(BigInteger)         # → UInt64
Column(Float)              # → Float64
Column(Numeric(10, 2))     # → Float64 (acceptable precision loss)
Column(Boolean)            # → UInt8 (0 or 1)
```

### Date/Time Types

```python
# SQLAlchemy
Column(DateTime)                    # → Date
Column(DateTime(timezone=True))     # → Date (UTC)
Column(Date)                        # → Date
Column(Time)                        # → String (store as HH:MM:SS)
```

### Special Cases

```python
# SQLAlchemy
Column(JSON)               # → String (store as JSON string)
Column(Enum(...))          # → String
Column(LargeBinary)        # → String (base64 encoded)
```

## 📊 Denormalization Example

Instead of joining tables in queries, embed frequently-accessed attributes:

**BAD - Requires JOIN:**
```sql
-- In ClickHouse, JOINs are expensive
SELECT
  oi.quantity,
  c.country,  -- Need to JOIN customers
  p.category  -- Need to JOIN products
FROM fact_order_item oi
JOIN dim_order o ON oi.order_id = o.id
JOIN dim_customer c ON o.customer_id = c.id
JOIN dim_product p ON oi.product_id = p.id
```

**GOOD - Pre-joined:**
```typescript
export interface OrderFact {
  // ... other fields
  quantity: number;
  customer_country: string;  // Denormalized from Customer
  product_category: string;  // Denormalized from Product
}
```

```sql
-- No JOINs needed!
SELECT
  quantity,
  customer_country,
  product_category
FROM order_fact_enriched
```

## ⚡ Best Practices

### 1. Use UInt64 for IDs
```typescript
// ✅ Good
id: UInt64

// ❌ Bad
id: number  // Loses ClickHouse optimization
```

### 2. Keep Foreign Keys
```typescript
// ✅ Good - Can still join if needed
order_id: UInt64
customer_id: UInt64

// ❌ Bad - Lost referential information
// (removed completely)
```

### 3. Choose Precision Carefully
```typescript
// ✅ Good for most cases
price: number  // Float64, fast

// ⚠️ Use Decimal only when precision critical
// price: Decimal(10,2)  // Slower but exact
```

### 4. Document Conversions
```typescript
export interface ProductDimension {
  id: UInt64;        // Integer → UInt64
  price: number;     // Numeric(10,2) → Float64 (acceptable loss)
  created_at: Date;  // DateTime(tz=True) → DateTime(UTC)
}
```

## 🚨 Common Mistakes

### ❌ Mistake #1: Keeping Relationships

```typescript
// ❌ WRONG
export interface Customer {
  id: UInt64;
  name: string;
  orders: Order[];  // Can't have relationships in OLAP!
}
```

```typescript
// ✅ CORRECT
export interface Customer {
  id: UInt64;
  name: string;
  // orders removed
}
```

### ❌ Mistake #2: Wrong Integer Type

```typescript
// ❌ WRONG
id: number  // Plain JavaScript number

// ✅ CORRECT
id: UInt64  // ClickHouse optimized type
```

### ❌ Mistake #3: Forgetting CDC Fields

```typescript
// ❌ WRONG
export const CustomerTable = new OlapTable<CustomerDimension>(...)

// ✅ CORRECT
export const CustomerTable = new OlapTable<CustomerDimension & CdcFields>(...)
```

## 📚 Learn More

- [TypeORM to OLAP Guide](../../typeorm-example/docs/OLAP_CONVERSION_GUIDE.md)
- [Moose Documentation](https://docs.fiveonefour.com/moose/)
- [ClickHouse Data Types](https://clickhouse.com/docs/en/sql-reference/data-types/)
- [SQLAlchemy Column Types](https://docs.sqlalchemy.org/en/20/core/type_basics.html)
