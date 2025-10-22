# TypeORM → Moose OLAP Conversion Guide

## Objective

Convert TypeORM entities (OLTP) to Moose OlapTable definitions (OLAP) for ClickHouse analytics while maintaining type safety and following dimensional modeling best practices.

## Core Principles

### 1. Extract Field Types from TypeORM Entities

Create a helper type to extract primitive fields while excluding methods and computed properties:

```typescript
type ExtractFields<T> = {
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
};

type CustomerFields = ExtractFields<Customer>;
type OrderFields = ExtractFields<Order>;
```

**Why:** Preserves type safety and keeps OLAP types in sync with OLTP schema changes.

### 2. Apply Star Schema Architecture

**Dimensions** (descriptive attributes):

- Create one dimension per main entity (Customer, Product, etc.)
- Use `Omit` to remove relations and `id`, then add `id: UInt64`
- Keep as Type 1 SCD (latest state only)

```typescript
type CustomerDimension = Omit<CustomerFields, 'id' | 'orders'> & { id: UInt64 };
```

**Facts** (measurable events):

- Create one fact table per business process (Sales, Orders, etc.)
- Define grain explicitly (e.g., "one row per order line item")
- Include foreign keys to dimensions as `UInt64`
- Denormalize frequently-queried attributes
- Pre-calculate measures

```typescript
interface OrderFact {
  id: UInt64;
  customerId: UInt64; // FK to dimension
  productId: UInt64; // FK to dimension
  orderDate: OrderFields['orderDate'];
  quantity: OrderItemFields['quantity'];
  revenue: number; // Pre-calculated measure
  customerCountry: CustomerFields['country']; // Denormalized
}
```

### 3. Remove Relations, Use Foreign Keys

**OLTP (TypeORM):**

```typescript
@ManyToOne(() => Customer)
customer: Customer;  // Object reference
```

**OLAP (Moose):**

```typescript
customerId: UInt64; // Scalar foreign key
```

### 4. Denormalize for Query Performance

Instead of joining multiple tables, embed frequently-queried attributes directly in fact tables:

```typescript
interface OrderFact {
  // Denormalized from Customer
  customerCountry: CustomerFields['country'];
  customerCity: CustomerFields['city'];

  // Denormalized from Product
  productCategory: ProductFields['category'];
  productName: ProductFields['name'];
}
```

### 5. Pre-Calculate Measures

```typescript
interface OrderFact {
  quantity: OrderItemFields['quantity'];
  unitPrice: OrderItemFields['price'];
  revenue: number; // quantity * unitPrice (calculated during ETL)
}
```

### 6. Use ClickHouse-Optimized Types

- **Primary Keys:** `UInt64` (unsigned, efficient)
- **Foreign Keys:** `UInt64`
- **Dates:** `Date` (DateTime in ClickHouse)
- **Strings:** Native TypeScript `string`
- **Numbers:** `number` (Float64 in ClickHouse)

### 7. Define OlapTable Instances

```typescript
export const CustomerDimension = new OlapTable<CustomerDimension>('dim_customer', {
  orderByFields: ['id'],
  // ReplacingMergeTree for Type 1 SCD (automatic deduplication)
});

export const OrderFact = new OlapTable<OrderFact>('fact_order', {
  orderByFields: ['orderDate', 'customerId', 'productId'],
  // MergeTree partitioned by toYYYYMM(orderDate)
});
```

## Step-by-Step Conversion Process

### Step 1: Analyze OLTP Schema

Identify:

- **Entities** → Candidates for dimensions
- **Transaction tables** → Candidates for facts
- **Common query patterns** → Attributes to denormalize

### Step 2: Create Field Extractors

```typescript
import { Customer, Order, Product, OrderItem } from '../src/entities';

type ExtractFields<T> = {
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
};

type CustomerFields = ExtractFields<Customer>;
type OrderFields = ExtractFields<Order>;
type ProductFields = ExtractFields<Product>;
type OrderItemFields = ExtractFields<OrderItem>;
```

### Step 3: Define Dimensions

For each main entity:

```typescript
type CustomerDimension = Omit<CustomerFields, 'id' | 'orders'> & {
  id: UInt64;
};

type ProductDimension = Omit<ProductFields, 'id' | 'orderItems'> & {
  id: UInt64;
};
```

**Pattern:** `Omit<EntityFields, 'id' | 'relationFields'> & { id: UInt64 }`

### Step 4: Define Facts

For each business process:

```typescript
interface OrderFact {
  // Primary key
  id: UInt64;

  // Foreign keys (UInt64)
  customerId: UInt64;
  productId: UInt64;

  // Time dimensions
  orderDate: OrderFields['orderDate'];

  // Measures (borrowed types)
  quantity: OrderItemFields['quantity'];
  unitPrice: OrderItemFields['price'];
  revenue: number; // Calculated

  // Denormalized attributes (borrowed types)
  orderStatus: OrderFields['status'];
  customerCountry: CustomerFields['country'];
  productCategory: ProductFields['category'];
}
```

### Step 5: Create OlapTable Instances

```typescript
export const CustomerDimension = new OlapTable<CustomerDimension>('dim_customer', {
  orderByFields: ['id'],
});

export const OrderFact = new OlapTable<OrderFact>('fact_order', {
  orderByFields: ['orderDate', 'customerId', 'productId'],
});
```

## Common Patterns

### Pattern 1: One-to-One Dimension Mapping

```typescript
// Customer entity → CustomerDimension
type CustomerDimension = Omit<CustomerFields, 'id' | 'orders'> & { id: UInt64 };
```

### Pattern 2: Fact Table with Denormalization

```typescript
// OrderItem + Order + Customer + Product → OrderFact (denormalized)
interface OrderFact {
  id: UInt64;
  customerId: UInt64;
  productId: UInt64;
  // Denormalized attributes from related entities
  customerCountry: CustomerFields['country'];
  productCategory: ProductFields['category'];
}
```

### Pattern 3: Time-Series Optimization

```typescript
export const OrderFact = new OlapTable<OrderFact>('fact_order', {
  orderByFields: ['orderDate', 'customerId', 'productId'],
  // ClickHouse will partition by toYYYYMM(orderDate)
});
```

## Validation Checklist

✅ **Type Safety**

- [ ] Field extractors created for all entities
- [ ] All OLAP types use borrowed types from OLTP
- [ ] No TypeScript errors

✅ **Star Schema**

- [ ] Clear separation of dimensions and facts
- [ ] Fact grain explicitly defined
- [ ] No relations (nested objects) in OLAP types

✅ **Performance**

- [ ] IDs converted to `UInt64`
- [ ] Frequently-queried attributes denormalized
- [ ] Measures pre-calculated
- [ ] Time fields present for partitioning

✅ **Moose Compatibility**

- [ ] All OlapTable instances exported
- [ ] Table names follow convention (`dim_*`, `fact_*`)
- [ ] `orderByFields` specified for each table

## Example Output Structure

```typescript
import { OlapTable, UInt64 } from '@514labs/moose-lib';
import { Customer, Order, Product, OrderItem } from '../src/entities';

// Field extractors
type ExtractFields<T> = {
  /* ... */
};
type CustomerFields = ExtractFields<Customer>;
// ...

// Dimensions
type CustomerDimension = Omit<CustomerFields, 'id' | 'orders'> & { id: UInt64 };
type ProductDimension = Omit<ProductFields, 'id' | 'orderItems'> & { id: UInt64 };

// Facts
interface OrderFact {
  id: UInt64;
  customerId: UInt64;
  productId: UInt64;
  orderDate: OrderFields['orderDate'];
  revenue: number;
  customerCountry: CustomerFields['country'];
}

// OlapTable instances
export const CustomerDimension = new OlapTable<CustomerDimension>('dim_customer', {
  orderByFields: ['id'],
});

export const OrderFact = new OlapTable<OrderFact>('fact_order', {
  orderByFields: ['orderDate', 'customerId', 'productId'],
});
```

## Anti-Patterns to Avoid

❌ **Don't use `InstanceType<typeof Entity>` directly**

- Problem: Includes TypeORM decorator metadata that Moose can't process
- Solution: Use `ExtractFields` helper

❌ **Don't include relations in OLAP types**

- Problem: Nested objects don't map to ClickHouse columns
- Solution: Use scalar foreign keys (`UInt64`)

❌ **Don't use `number` for IDs**

- Problem: Inefficient in ClickHouse
- Solution: Always use `UInt64` for IDs and foreign keys

❌ **Don't create normalized OLAP tables**

- Problem: Defeats the purpose of OLAP (requires joins)
- Solution: Denormalize frequently-queried attributes in fact tables

## Benefits of This Approach

1. **Type Safety:** Changes to TypeORM entities automatically propagate to OLAP
2. **DRY:** No duplicate type definitions
3. **Moose Compatible:** Clean types that Moose can analyze and convert to ClickHouse
4. **Performance:** Optimized for analytical queries (denormalization, pre-calculation)
5. **Maintainable:** Clear structure and borrowing pattern
