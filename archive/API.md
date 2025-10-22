# API Reference

Complete API documentation for the `@oltp-olap/shared` package.

## Table of Contents

- [Installation](#installation)
- [Types](#types)
  - [OLTPRecord](#oltprecord)
  - [OLAPDimension](#olapdimension)
  - [OLAPFact](#olapfact)
  - [DimensionConfig](#dimensionconfig)
  - [FactConfig](#factconfig)
  - [MeasureConfig](#measureconfig)
  - [DimensionLink](#dimensionlink)
  - [TransformationConfig](#transformationconfig)
- [Classes](#classes)
  - [OLAPTransformer](#olaptransformer)
- [Usage Examples](#usage-examples)

## Installation

```bash
npm install @oltp-olap/shared
# or
pnpm add @oltp-olap/shared
# or
yarn add @oltp-olap/shared
```

## Types

### OLTPRecord

Represents a generic OLTP record from a normalized database table.

```typescript
interface OLTPRecord {
  id: string | number;
  [key: string]: any;
}
```

**Properties:**
- `id` - Unique identifier (string or number)
- `[key: string]` - Additional fields from the source table

**Example:**
```typescript
const customer: OLTPRecord = {
  id: 1,
  name: 'Alice',
  email: 'alice@example.com',
  country: 'USA'
};
```

---

### OLAPDimension

Represents a dimension in a star schema. Dimensions provide descriptive context for facts.

```typescript
interface OLAPDimension {
  dimensionKey: string;
  attributes: Record<string, any>;
}
```

**Properties:**
- `dimensionKey` - Unique identifier for this dimension record
- `attributes` - Key-value pairs of dimensional attributes

**Example:**
```typescript
const customerDimension: OLAPDimension = {
  dimensionKey: '1',
  attributes: {
    name: 'Alice',
    email: 'alice@example.com',
    country: 'USA',
    city: 'New York'
  }
};
```

---

### OLAPFact

Represents a fact in a star schema. Facts are measurable events containing numeric measures and dimension references.

```typescript
interface OLAPFact {
  factKey: string;
  measures: Record<string, number>;
  dimensionKeys: Record<string, string | number>;
  timestamp: Date;
}
```

**Properties:**
- `factKey` - Unique identifier for this fact record
- `measures` - Numeric values that can be aggregated
- `dimensionKeys` - Foreign keys linking to related dimensions
- `timestamp` - When this fact occurred

**Example:**
```typescript
const salesFact: OLAPFact = {
  factKey: 'sales_123',
  measures: {
    quantity: 5,
    revenue: 499.95
  },
  dimensionKeys: {
    customer: 1,
    product: 42
  },
  timestamp: new Date('2025-01-20')
};
```

---

### DimensionConfig

Configuration for transforming an OLTP table into a dimension.

```typescript
interface DimensionConfig {
  name: string;
  sourceTable: string;
  keyField: string;
  attributes: string[];
}
```

**Properties:**
- `name` - Logical name of the dimension (e.g., 'customer', 'product')
- `sourceTable` - Name of the source OLTP table
- `keyField` - Field to use as the dimension key
- `attributes` - Array of field names to extract as dimensional attributes

**Example:**
```typescript
const customerConfig: DimensionConfig = {
  name: 'customer',
  sourceTable: 'customers',
  keyField: 'id',
  attributes: ['name', 'email', 'country', 'city']
};
```

---

### FactConfig

Configuration for transforming OLTP records into fact table entries.

```typescript
interface FactConfig {
  name: string;
  sourceTable: string;
  measures: MeasureConfig[];
  dimensionLinks: DimensionLink[];
  timestampField?: string;
}
```

**Properties:**
- `name` - Logical name of the fact table (e.g., 'sales', 'inventory')
- `sourceTable` - Name of the source OLTP table
- `measures` - Array of measure configurations
- `dimensionLinks` - Array of dimension link configurations
- `timestampField` - Optional field name containing the event timestamp

**Example:**
```typescript
const salesConfig: FactConfig = {
  name: 'sales',
  sourceTable: 'order_items',
  measures: [
    { field: 'quantity', aggregation: 'sum' },
    { field: 'revenue', aggregation: 'sum' }
  ],
  dimensionLinks: [
    { dimensionName: 'customer', foreignKey: 'customerId' },
    { dimensionName: 'product', foreignKey: 'productId' }
  ],
  timestampField: 'orderDate'
};
```

---

### MeasureConfig

Configuration for a measure (metric) in a fact table.

```typescript
interface MeasureConfig {
  field: string;
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
}
```

**Properties:**
- `field` - Name of the numeric field in the source table
- `aggregation` - Type of aggregation to perform

**Aggregation Types:**
- `'sum'` - Sum all values
- `'avg'` - Calculate average
- `'count'` - Count occurrences
- `'min'` - Find minimum value
- `'max'` - Find maximum value

**Example:**
```typescript
const quantityMeasure: MeasureConfig = {
  field: 'quantity',
  aggregation: 'sum'
};
```

---

### DimensionLink

Configuration for linking a fact to a dimension via a foreign key.

```typescript
interface DimensionLink {
  dimensionName: string;
  foreignKey: string;
}
```

**Properties:**
- `dimensionName` - Logical name of the target dimension
- `foreignKey` - Field name in the source table that references the dimension

**Example:**
```typescript
const customerLink: DimensionLink = {
  dimensionName: 'customer',
  foreignKey: 'customerId'
};
```

---

### TransformationConfig

Complete transformation configuration for converting OLTP to OLAP.

```typescript
interface TransformationConfig {
  dimensions: DimensionConfig[];
  facts: FactConfig[];
}
```

**Properties:**
- `dimensions` - Array of dimension configurations
- `facts` - Array of fact configurations

**Example:**
```typescript
const config: TransformationConfig = {
  dimensions: [customerDimConfig, productDimConfig],
  facts: [salesFactConfig]
};
```

---

## Classes

### OLAPTransformer

Core transformation utilities for converting OLTP data to OLAP structures.

All methods are static and pure - they don't modify input data and have no side effects.

#### Methods

##### transformToDimension

Transforms normalized OLTP records into dimension structures.

```typescript
static transformToDimension(
  records: OLTPRecord[],
  config: DimensionConfig
): OLAPDimension[]
```

**Parameters:**
- `records` - Array of OLTP records from a normalized table
- `config` - Configuration specifying which fields to extract

**Returns:**
- Array of dimension objects with keys and attributes

**Behavior:**
- Only attributes listed in `config.attributes` are extracted
- Undefined attributes are skipped (not included in output)
- The `keyField` is converted to string for the `dimensionKey`
- Original record structure is not preserved

**Example:**
```typescript
import { OLAPTransformer } from '@oltp-olap/shared';

const customers = [
  { id: 1, name: 'Alice', email: 'alice@example.com', country: 'USA', city: 'New York' },
  { id: 2, name: 'Bob', email: 'bob@example.com', country: 'UK', city: 'London' }
];

const config = {
  name: 'customer',
  sourceTable: 'customers',
  keyField: 'id',
  attributes: ['name', 'email', 'country', 'city']
};

const dimensions = OLAPTransformer.transformToDimension(customers, config);

// Result:
// [
//   {
//     dimensionKey: '1',
//     attributes: { name: 'Alice', email: 'alice@example.com', country: 'USA', city: 'New York' }
//   },
//   {
//     dimensionKey: '2',
//     attributes: { name: 'Bob', email: 'bob@example.com', country: 'UK', city: 'London' }
//   }
// ]
```

---

##### transformToFact

Transforms normalized OLTP records into fact table entries.

```typescript
static transformToFact(
  records: OLTPRecord[],
  config: FactConfig
): OLAPFact[]
```

**Parameters:**
- `records` - Array of OLTP records (often from joined tables)
- `config` - Configuration specifying measures and dimension links

**Returns:**
- Array of fact objects with measures and dimension keys

**Behavior:**
- Only numeric fields are extracted as measures
- Non-numeric measure fields are skipped
- Dimension links extract foreign key values
- If no `timestampField` is configured, current time is used
- `factKey` is generated as `{name}_{id}` or `{name}_{random}` if no id

**Example:**
```typescript
import { OLAPTransformer } from '@oltp-olap/shared';

const orderItems = [
  {
    id: 1,
    orderId: 100,
    customerId: 1,
    productId: 42,
    quantity: 2,
    price: 199.98,
    orderDate: new Date()
  }
];

const config = {
  name: 'sales',
  sourceTable: 'order_items',
  measures: [
    { field: 'quantity', aggregation: 'sum' },
    { field: 'price', aggregation: 'sum' }
  ],
  dimensionLinks: [
    { dimensionName: 'customer', foreignKey: 'customerId' },
    { dimensionName: 'product', foreignKey: 'productId' }
  ],
  timestampField: 'orderDate'
};

const facts = OLAPTransformer.transformToFact(orderItems, config);

// Result:
// [
//   {
//     factKey: 'sales_1',
//     measures: { quantity: 2, price: 199.98 },
//     dimensionKeys: { customer: 1, product: 42 },
//     timestamp: Date
//   }
// ]
```

---

##### aggregateFacts

Aggregates fact measures by a specified dimension.

```typescript
static aggregateFacts(
  facts: OLAPFact[],
  dimensionKey: string,
  aggregation: 'sum' | 'avg' | 'count' = 'sum'
): Map<string | number, Record<string, number>>
```

**Parameters:**
- `facts` - Array of fact records to aggregate
- `dimensionKey` - Name of the dimension to group by (must match a dimension in facts)
- `aggregation` - Type of aggregation: `'sum'` (default), `'avg'`, or `'count'`

**Returns:**
- Map of dimension keys to aggregated measures

**Behavior:**
- Facts missing the specified dimension key are skipped
- For `'avg'`, intermediate sums and counts are calculated
- The output Map preserves the original dimension key type (string or number)
- Multiple measures in the same fact are aggregated independently

**Example - Sum Aggregation:**
```typescript
import { OLAPTransformer } from '@oltp-olap/shared';

const facts = [
  {
    factKey: 'f1',
    measures: { quantity: 5, revenue: 100 },
    dimensionKeys: { customer: 1 },
    timestamp: new Date()
  },
  {
    factKey: 'f2',
    measures: { quantity: 3, revenue: 60 },
    dimensionKeys: { customer: 1 },
    timestamp: new Date()
  },
  {
    factKey: 'f3',
    measures: { quantity: 10, revenue: 200 },
    dimensionKeys: { customer: 2 },
    timestamp: new Date()
  }
];

const result = OLAPTransformer.aggregateFacts(facts, 'customer', 'sum');

// Result:
// Map {
//   1 => { quantity: 8, revenue: 160 },
//   2 => { quantity: 10, revenue: 200 }
// }
```

**Example - Average Aggregation:**
```typescript
const avgResult = OLAPTransformer.aggregateFacts(facts, 'product', 'avg');

// Calculates average of measures per product
// Internal tracking: {measure}_sum and {measure}_count
// Output: { [measure]: sum / count }
```

---

## Usage Examples

### Complete ETL Pipeline

```typescript
import { OLAPTransformer } from '@oltp-olap/shared';
import type { DimensionConfig, FactConfig } from '@oltp-olap/shared';

// Step 1: Define configurations
const customerDimConfig: DimensionConfig = {
  name: 'customer',
  sourceTable: 'customers',
  keyField: 'id',
  attributes: ['name', 'email', 'country', 'city']
};

const productDimConfig: DimensionConfig = {
  name: 'product',
  sourceTable: 'products',
  keyField: 'id',
  attributes: ['name', 'category', 'price']
};

const salesFactConfig: FactConfig = {
  name: 'sales',
  sourceTable: 'order_items',
  measures: [
    { field: 'quantity', aggregation: 'sum' },
    { field: 'price', aggregation: 'sum' }
  ],
  dimensionLinks: [
    { dimensionName: 'customer', foreignKey: 'customerId' },
    { dimensionName: 'product', foreignKey: 'productId' }
  ],
  timestampField: 'orderDate'
};

// Step 2: Extract data from OLTP source (using your ORM)
const customers = await orm.customers.findAll();
const products = await orm.products.findAll();
const orderItems = await orm.orderItems.findAll({ include: ['order'] });

// Step 3: Transform to dimensions
const customerDimensions = OLAPTransformer.transformToDimension(
  customers,
  customerDimConfig
);

const productDimensions = OLAPTransformer.transformToDimension(
  products,
  productDimConfig
);

// Step 4: Enrich and transform to facts
const enrichedOrderItems = orderItems.map(item => ({
  ...item,
  customerId: item.order.customerId,
  orderDate: item.order.orderDate
}));

const salesFacts = OLAPTransformer.transformToFact(
  enrichedOrderItems,
  salesFactConfig
);

// Step 5: Perform analytics
const salesByCustomer = OLAPTransformer.aggregateFacts(
  salesFacts,
  'customer',
  'sum'
);

const salesByProduct = OLAPTransformer.aggregateFacts(
  salesFacts,
  'product',
  'sum'
);

// Step 6: Display results
salesByCustomer.forEach((measures, customerId) => {
  const customer = customers.find(c => c.id === customerId);
  console.log(`${customer.name}: ${measures.quantity} items, $${measures.price} revenue`);
});
```

### Working with Multiple Fact Tables

```typescript
// Define multiple fact configurations
const inventoryFactConfig: FactConfig = {
  name: 'inventory',
  sourceTable: 'inventory_snapshots',
  measures: [
    { field: 'quantity_on_hand', aggregation: 'sum' },
    { field: 'quantity_on_order', aggregation: 'sum' }
  ],
  dimensionLinks: [
    { dimensionName: 'product', foreignKey: 'productId' },
    { dimensionName: 'warehouse', foreignKey: 'warehouseId' }
  ],
  timestampField: 'snapshotDate'
};

// Transform different fact tables
const salesFacts = OLAPTransformer.transformToFact(orderItems, salesFactConfig);
const inventoryFacts = OLAPTransformer.transformToFact(snapshots, inventoryFactConfig);

// Analyze separately
const salesByProduct = OLAPTransformer.aggregateFacts(salesFacts, 'product', 'sum');
const inventoryByWarehouse = OLAPTransformer.aggregateFacts(inventoryFacts, 'warehouse', 'sum');
```

### Custom Aggregation Logic

```typescript
// Get aggregated data
const salesByProduct = OLAPTransformer.aggregateFacts(facts, 'product', 'sum');

// Apply custom logic
salesByProduct.forEach((measures, productId) => {
  // Calculate profit margin
  const margin = (measures.revenue - measures.cost) / measures.revenue * 100;

  // Calculate average order value
  const aov = measures.revenue / measures.orderCount;

  console.log(`Product ${productId}: Margin ${margin}%, AOV $${aov}`);
});
```

### TypeScript Integration

```typescript
// Strong typing for your domain
interface Customer extends OLTPRecord {
  name: string;
  email: string;
  country: string;
  city: string;
}

interface Product extends OLTPRecord {
  name: string;
  category: string;
  price: number;
}

// Type-safe transformations
const customers: Customer[] = await orm.customers.findAll();
const customerDims: OLAPDimension[] = OLAPTransformer.transformToDimension(
  customers,
  customerDimConfig
);
```

## Best Practices

### 1. Configuration Management

Store configurations in separate files:

```typescript
// configs/dimensions.ts
export const customerDimConfig: DimensionConfig = { /* ... */ };
export const productDimConfig: DimensionConfig = { /* ... */ };

// configs/facts.ts
export const salesFactConfig: FactConfig = { /* ... */ };
export const inventoryFactConfig: FactConfig = { /* ... */ };
```

### 2. Data Enrichment

Enrich data before transformation:

```typescript
// Join related data first
const enrichedData = orderItems.map(item => ({
  ...item,
  customerId: item.order.customerId,
  orderDate: item.order.orderDate,
  customerCountry: item.order.customer.country
}));

// Then transform
const facts = OLAPTransformer.transformToFact(enrichedData, config);
```

### 3. Error Handling

Handle missing or invalid data:

```typescript
try {
  const dimensions = OLAPTransformer.transformToDimension(records, config);
} catch (error) {
  console.error('Transformation failed:', error);
  // Handle error appropriately
}

// Validate configurations
function validateConfig(config: DimensionConfig): boolean {
  return config.attributes.length > 0 && config.keyField !== '';
}
```

### 4. Performance Optimization

For large datasets:

```typescript
// Process in batches
const batchSize = 1000;
for (let i = 0; i < records.length; i += batchSize) {
  const batch = records.slice(i, i + batchSize);
  const dimensions = OLAPTransformer.transformToDimension(batch, config);
  await loadToWarehouse(dimensions);
}
```

## See Also

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture and design
- [SETUP.md](./SETUP.md) - Setup and installation guide
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
- [README.md](./README.md) - Project overview
