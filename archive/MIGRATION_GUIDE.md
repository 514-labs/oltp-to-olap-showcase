

# Migration Guide: TypeScript Type Inference & ClickHouse Integration

This guide explains the refactored architecture and how to use the new type-inference and MooseStack OLAP features.

## What Changed

### Before (v1.0)

The original implementation focused on **generic** OLTP-to-OLAP transformations:
- Used plain JavaScript objects as records
- Manual configuration for dimension/fact extraction
- No type inference from ORM models
- No specific database target

### After (v2.0 - Current)

The refactored implementation adds **type-safe** ClickHouse schema generation:
- ✨ **Type Inference** from ORM model definitions
- 🚀 **MooseStack OLAP** patterns for ClickHouse
- 📊 **Automatic Schema Generation** optimized for analytical workloads
- 🛠️ **Deployment Scripts** for production ClickHouse clusters

## New Architecture

```
ORM Model Definitions (TypeScript Types)
           ↓
    Type Inference Layer
           ↓
    MooseStack OLAP Module
           ↓
  ClickHouse Schema Generation
           ↓
    Deployment Scripts (DDL)
```

## New Modules

### 1. Type Utilities (`type-utils.ts`)

Provides TypeScript utilities for working with inferred types:

```typescript
import { defineDimension, defineFact, Key } from '@oltp-olap/shared';

// Define type-safe dimension configuration
const customerDim = defineDimension<CustomerModel, 'name' | 'email'>({
  name: 'customer',
  sourceTable: 'Customer',
  keyField: 'id',
  attributes: ['name', 'email'] as const
});

// Define type-safe fact configuration
const salesFact = defineFact<SalesModel, 'quantity' | 'price', {
  customer: number;
  product: number;
}>({
  name: 'sales',
  sourceTable: 'OrderItem',
  measures: [
    { field: 'quantity', aggregation: 'sum' },
    { field: 'price', aggregation: 'sum' }
  ] as const,
  dimensionLinks: [
    { dimensionName: 'customer', foreignKey: 'customerId' },
    { dimensionName: 'product', foreignKey: 'productId' }
  ] as const
});
```

### 2. MooseStack OLAP Integration (`moose-olap.ts`)

Implements MooseStack-style OLAP table definitions:

```typescript
import { OlapTable, generateDimensionTable, generateFactTable } from '@oltp-olap/shared';

// Create dimension table
const { table, ddl } = generateDimensionTable({
  name: 'dim_customer',
  type: customerModel,
  keyField: 'id',
  engine: 'ReplacingMergeTree'
}, typeMap);

// Create fact table
const { table, ddl } = generateFactTable({
  name: 'fact_sales',
  type: salesModel,
  orderBy: ['timestamp', 'customerId'],
  partitionBy: ['toYYYYMM(timestamp)'],
  engine: 'MergeTree'
}, typeMap);
```

### 3. ClickHouse Generator (`clickhouse-generator.ts`)

Automatically generates ClickHouse schemas from sample records:

```typescript
import { StarSchemaGenerator, generateDimensionFromModel } from '@oltp-olap/shared';

// Create schema generator
const generator = new StarSchemaGenerator();

// Add dimension with automatic type inference
generator.addDimension('dim_customer', sampleCustomer, {
  keyField: 'id',
  attributes: ['name', 'email', 'country', 'city']
});

// Add fact table
generator.addFact('fact_sales', sampleSalesFact, {
  measures: ['quantity', 'price'],
  dimensionKeys: ['customerId', 'productId'],
  timestampField: 'orderDate'
});

// Generate all DDL
const ddl = generator.generateDDL();
```

## Migration Examples

### Prisma

#### Before

```typescript
// Manual configuration
const config: DimensionConfig = {
  name: 'customer',
  sourceTable: 'customers',
  keyField: 'id',
  attributes: ['name', 'email']
};

const records = await prisma.customer.findMany();
const dimensions = OLAPTransformer.transformToDimension(records, config);
```

#### After

```typescript
import type { Customer } from '@prisma/client';
import { StarSchemaGenerator } from '@oltp-olap/shared';

// Types are automatically inferred from Prisma Client
type CustomerModel = Customer;

const sampleCustomer = await prisma.customer.findFirst();
const generator = new StarSchemaGenerator();

// Automatic type inference + ClickHouse schema generation
generator.addDimension('dim_customer', sampleCustomer!, {
  keyField: 'id',
  attributes: ['name', 'email', 'country', 'city']
});

// Get ClickHouse DDL
const ddl = generator.generateDDL();
console.log(ddl);
// CREATE TABLE IF NOT EXISTS dim_customer (
//   id UInt64,
//   name LowCardinality(String),
//   email LowCardinality(String),
//   ...
// ) ENGINE = ReplacingMergeTree() ...
```

### Drizzle

```typescript
import { customers } from './schema';
import type { InferModel } from 'drizzle-orm';
import { StarSchemaGenerator } from '@oltp-olap/shared';

// Infer type from Drizzle schema
type CustomerModel = InferModel<typeof customers>;

const sampleCustomer: CustomerModel = await db.select().from(customers).limit(1);
const generator = new StarSchemaGenerator();

generator.addDimension('dim_customer', sampleCustomer, {
  keyField: 'id',
  attributes: ['name', 'email', 'country', 'city']
});
```

### TypeORM

```typescript
import { Customer } from './entities/Customer';
import { StarSchemaGenerator } from '@oltp-olap/shared';

// Type is the entity class
type CustomerModel = Customer;

const sampleCustomer = await customerRepository.findOne({ where: {} });
const generator = new StarSchemaGenerator();

generator.addDimension('dim_customer', sampleCustomer!, {
  keyField: 'id',
  attributes: ['name', 'email', 'country', 'city']
});
```

### Sequelize

```typescript
import { Customer } from './models';
import type { InferAttributes } from 'sequelize';
import { StarSchemaGenerator } from '@oltp-olap/shared';

// Infer type from Sequelize model
type CustomerModel = InferAttributes<Customer>;

const sampleCustomer = await Customer.findOne();
const generator = new StarSchemaGenerator();

generator.addDimension('dim_customer', sampleCustomer!.toJSON(), {
  keyField: 'id',
  attributes: ['name', 'email', 'country', 'city']
});
```

## ClickHouse Optimizations

The generator automatically applies ClickHouse best practices:

### Dimension Tables

```sql
CREATE TABLE dim_customer (
  id UInt64,                        -- Optimized integer type
  email LowCardinality(String),     -- Low cardinality for repeated values
  name LowCardinality(String),
  country LowCardinality(String),
  city LowCardinality(String),
  createdAt DateTime
)
ENGINE = ReplacingMergeTree()       -- Deduplication for slowly changing dimensions
ORDER BY (id)                       -- Efficient lookups by primary key
PRIMARY KEY (id);
```

### Fact Tables

```sql
CREATE TABLE fact_sales (
  quantity UInt64,
  price Float64,
  customerId UInt64,
  productId UInt64,
  orderDate DateTime
)
ENGINE = MergeTree()                -- Fast inserts and queries
ORDER BY (orderDate, customerId, productId)  -- Optimized for time-series queries
PARTITION BY toYYYYMM(orderDate);   -- Monthly partitions for data lifecycle management
```

## Type Inference Benefits

### 1. Compile-Time Safety

```typescript
const customerDim = defineDimension<Customer, 'name' | 'email'>({
  name: 'customer',
  sourceTable: 'Customer',
  keyField: 'id',
  attributes: ['name', 'email', 'invalid'] // ❌ TypeScript error!
  //                               ^^^^^^^ Property 'invalid' does not exist on type Customer
});
```

### 2. Auto-Completion

Your IDE will provide auto-complete for:
- `keyField` - Must be a valid property of the model
- `attributes` - Only valid model properties
- `measures` - Only numeric fields for facts

### 3. Refactoring Safety

When you rename a field in your ORM model:
- TypeScript will catch all usages
- No runtime errors from typos
- Guaranteed consistency

## Deployment Workflow

### 1. Generate Schemas

```bash
pnpm --filter @oltp-olap/prisma-example run dev > deploy.sql
```

### 2. Review Generated DDL

```sql
-- Review the generated schema
cat deploy.sql
```

### 3. Deploy to ClickHouse

```bash
# Using generated deployment script
bash deploy-clickhouse.sh

# Or manually
clickhouse-client --query "$(cat deploy.sql)"
```

### 4. Verify Tables

```bash
clickhouse-client --query "SHOW TABLES FROM oltp_to_olap"
```

## Advanced Features

### Custom Table Engines

```typescript
import { generateFactTable } from '@oltp-olap/shared';

// SummingMergeTree for pre-aggregation
const { table, ddl } = generateFactTable({
  name: 'fact_sales_aggregated',
  type: salesModel,
  orderBy: ['date', 'productId'],
  engine: 'SummingMergeTree'  // Automatically sums measures
}, typeMap);
```

### Time-Series Optimization

```typescript
import { createTimeSeriesTable } from '@oltp-olap/shared';

const { table, ddl } = createTimeSeriesTable(
  'events',
  typeMap,
  'timestamp',
  ['userId', 'eventType']
);
// Automatically configured for time-series queries
```

### Materialized Views

```typescript
import { generateMaterializedView } from '@oltp-olap/shared';

const viewDDL = generateMaterializedView(
  'mv_daily_sales',
  'fact_sales',
  'fact_sales_daily',
  `
    SELECT
      toDate(orderDate) as date,
      productId,
      sum(quantity) as total_quantity,
      sum(price) as total_revenue
    FROM fact_sales
    GROUP BY date, productId
  `
);
```

## Backward Compatibility

**The original transformation API is still available:**

```typescript
import { OLAPTransformer } from '@oltp-olap/shared';

// Old API still works
const dimensions = OLAPTransformer.transformToDimension(records, config);
const facts = OLAPTransformer.transformToFact(records, factConfig);
const aggregated = OLAPTransformer.aggregateFacts(facts, 'customer', 'sum');
```

**You can use both approaches together:**

```typescript
// Generate ClickHouse schema
const generator = new StarSchemaGenerator();
generator.addDimension('dim_customer', sampleCustomer, config);

// Transform and aggregate data
const dimensions = OLAPTransformer.transformToDimension(customers, config);
const facts = OLAPTransformer.transformToFact(orderItems, factConfig);
const aggregated = OLAPTransformer.aggregateFacts(facts, 'customer', 'sum');

// Deploy to ClickHouse
const ddl = generator.generateDDL();
```

## Best Practices

### 1. Use Sample Records for Schema Generation

```typescript
// ✅ Good: Use actual sample record
const sample = await prisma.customer.findFirst();
generator.addDimension('dim_customer', sample!, config);

// ❌ Bad: Manual type mapping (error-prone)
const typeMap = { id: 'UInt64', name: 'String' };
```

### 2. Type Your Configurations

```typescript
// ✅ Good: Type-safe configuration
const config = defineDimension<Customer, 'name' | 'email'>({
  name: 'customer',
  sourceTable: 'Customer',
  keyField: 'id',
  attributes: ['name', 'email'] as const
});

// ❌ Bad: Untyped (no compile-time checks)
const config = {
  name: 'customer',
  sourceTable: 'Customer',
  keyField: 'id',
  attributes: ['name', 'email', 'typo']  // Typo not caught!
};
```

### 3. Partition Large Fact Tables

```typescript
// ✅ Good: Monthly partitions for time-series data
generator.addFact('fact_events', sampleEvent, {
  measures: ['count', 'duration'],
  dimensionKeys: ['userId', 'eventType'],
  timestampField: 'timestamp'  // Automatically partitions by month
});

// ❌ Bad: No partitioning (poor performance for large tables)
```

### 4. Use LowCardinality for Repeated Values

The generator automatically applies `LowCardinality` for:
- Short strings (< 50 chars)
- Enum-like fields
- Category fields

Manual override:
```typescript
const typeMap = {
  id: 'UInt64',
  status: 'LowCardinality(String)',  // Explicit low cardinality
  description: 'String'               // Not low cardinality
};
```

## Troubleshooting

### Type Inference Issues

**Problem:** Types not being inferred correctly

**Solution:** Ensure you're using a sample record, not a plain object:

```typescript
// ❌ Wrong
const sample = { id: 1, name: 'test' };

// ✅ Correct
const sample = await orm.model.findFirst();
```

### ClickHouse Type Mapping

**Problem:** Incorrect ClickHouse types generated

**Solution:** The generator uses heuristics. Override if needed:

```typescript
const { table, ddl, typeMap } = generateDimensionFromModel(name, sample, config);

// Override specific types
typeMap.userId = 'UUID';  // Instead of UInt64
typeMap.metadata = 'String';  // JSON as string
```

### Deployment Errors

**Problem:** DDL fails to execute in ClickHouse

**Solution:** Check for reserved keywords and special characters:

```sql
-- ❌ 'user' is a reserved keyword
CREATE TABLE user (...)

-- ✅ Use backticks
CREATE TABLE `user` (...)
```

## Next Steps

1. **Run the Prisma example** to see the full workflow
2. **Review the generated DDL** and understand ClickHouse optimizations
3. **Adapt to your ORM** (Drizzle, TypeORM, Sequelize)
4. **Deploy to your ClickHouse cluster**
5. **Build analytical queries** on your OLAP tables

## Resources

- [MooseStack Documentation](https://docs.fiveonefour.com/moose/olap)
- [ClickHouse Documentation](https://clickhouse.com/docs)
- [Star Schema Design](https://en.wikipedia.org/wiki/Star_schema)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
