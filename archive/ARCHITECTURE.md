# Architecture

This document describes the architecture and design decisions of the OLTP to OLAP Showcase monorepo.

## Overview

The project is structured as a monorepo containing:
- **Packages** - 1 shared library with reusable transformation utilities
- **Apps** - 4 ORM example applications using different TypeScript ORMs
- **pnpm workspaces** - Dependency and build management

## Design Principles

### 1. ORM Agnostic Core

The `@oltp-olap/shared` package contains ORM-agnostic transformation logic. This design:
- Promotes code reuse across different ORM implementations
- Separates transformation logic from data access
- Makes it easy to add new ORM examples
- Provides consistent transformation APIs

### 2. Declarative Configuration

Transformations are configured declaratively using configuration objects:

```typescript
const dimensionConfig: DimensionConfig = {
  name: 'customer',
  sourceTable: 'Customer',
  keyField: 'id',
  attributes: ['name', 'email', 'country', 'city']
};
```

Benefits:
- Easy to understand and modify
- Separates "what" from "how"
- Can be serialized/stored in configuration files
- Enables code generation possibilities

### 3. Star Schema Pattern

The transformation targets a star schema design:
- **Dimensions** - Descriptive attributes (who, what, where, when)
- **Facts** - Measurable events with foreign keys to dimensions
- **Measures** - Numeric values that can be aggregated

This is the industry standard for OLAP/data warehouse design.

## Architecture Layers

### Layer 1: Data Access (ORM-Specific)

Each ORM example handles:
- Schema definition in ORM-native syntax
- CRUD operations
- Query building
- Relationship loading

**Example ORMs:**
- **Prisma** - Schema-first with generated client
- **Drizzle** - TypeScript-first with SQL-like API
- **TypeORM** - Decorator-based entities
- **Sequelize** - Model-based with associations

### Layer 2: Data Extraction

Each example extracts OLTP data using ORM-specific APIs:
- Simple queries for dimension source tables
- Joined queries for fact tables (to get dimension keys)
- Type-safe operations where supported

### Layer 3: Transformation (Shared)

The `OLAPTransformer` class provides three core operations:

#### transformToDimension
Converts OLTP records to dimension structures:
```typescript
Input:  [{ id: 1, name: 'Alice', email: 'alice@example.com', country: 'USA' }]
Output: [{ dimensionKey: '1', attributes: { name: 'Alice', email: 'alice@example.com', country: 'USA' } }]
```

#### transformToFact
Converts OLTP records to fact structures:
```typescript
Input:  [{ id: 1, quantity: 5, price: 100, productId: 10, customerId: 20 }]
Output: [{
  factKey: 'sales_1',
  measures: { quantity: 5, price: 100 },
  dimensionKeys: { product: 10, customer: 20 },
  timestamp: Date
}]
```

#### aggregateFacts
Aggregates measures by dimension:
```typescript
Input:  Facts array + dimension name + aggregation type
Output: Map<dimensionKey, aggregatedMeasures>
```

### Layer 4: Analytics

Examples demonstrate common analytical queries:
- Sales by product
- Sales by customer
- Sum, average, count aggregations
- Grouping by dimensions

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         ORM Example                              │
│                                                                  │
│  1. Define Schema (ORM-specific)                                │
│  2. Seed Data (OLTP normalized tables)                          │
│  3. Extract Data (ORM queries)                                  │
│       ↓                                                          │
│  4. Transform to Dimensions (shared)                            │
│       ↓                                                          │
│  5. Transform to Facts (shared)                                 │
│       ↓                                                          │
│  6. Aggregate Facts (shared)                                    │
│       ↓                                                          │
│  7. Display Analytics                                           │
└─────────────────────────────────────────────────────────────────┘
```

## Type System

### Shared Types

All transformations use common TypeScript types:

```typescript
// Raw OLTP record (flexible)
interface OLTPRecord {
  id: string | number;
  [key: string]: any;
}

// Dimension output (descriptive attributes)
interface OLAPDimension {
  dimensionKey: string;
  attributes: Record<string, any>;
}

// Fact output (measures + dimension references)
interface OLAPFact {
  factKey: string;
  measures: Record<string, number>;
  dimensionKeys: Record<string, string | number>;
  timestamp: Date;
}
```

### Type Safety

- Shared package has full TypeScript types
- Each ORM example leverages ORM-specific type generation
- No runtime type checking (compile-time only)

## Monorepo Structure

```
oltp-to-olap-showcase/
├── packages/
│   └── shared/                 # @oltp-olap/shared
│       ├── src/
│       │   ├── types.ts       # Type definitions
│       │   ├── transformers.ts # Core transformation logic
│       │   └── index.ts       # Public API
│       ├── package.json
│       └── tsconfig.json
│
├── apps/
│   ├── prisma-example/         # @oltp-olap/prisma-example
│   │   ├── prisma/
│   │   │   └── schema.prisma  # Prisma schema
│   │   ├── src/
│   │   │   └── index.ts       # Example implementation
│   │   └── package.json
│   │
│   ├── drizzle-example/        # @oltp-olap/drizzle-example
│   │   ├── src/
│   │   │   ├── schema.ts      # Drizzle schema
│   │   │   └── index.ts       # Example implementation
│   │   └── package.json
│   │
│   ├── typeorm-example/        # @oltp-olap/typeorm-example
│   │   ├── src/
│   │   │   ├── entities/      # TypeORM entities
│   │   │   └── index.ts       # Example implementation
│   │   └── package.json
│   │
│   └── sequelize-example/      # @oltp-olap/sequelize-example
│       ├── src/
│       │   ├── models/        # Sequelize models
│       │   └── index.ts       # Example implementation
│       └── package.json
│
├── package.json                # Root package
├── pnpm-workspace.yaml         # Workspace configuration
└── tsconfig.json              # Base TypeScript config
```

## Build System

### pnpm Workspaces

- Efficient disk usage via hard links
- Fast installs
- Workspace protocol for local packages: `workspace:*`
- Hoisting optimization
- Built-in task running with `pnpm -r` (recursive) and `pnpm --parallel`
- Native support for monorepo workflows

**Available commands:**
- `pnpm -r build` - Build all packages recursively
- `pnpm -r --parallel dev` - Run all dev servers in parallel
- `pnpm --filter <package-name> <command>` - Run command in specific package

### TypeScript

- Base `tsconfig.json` at root
- Each package extends base config
- `composite: true` for project references
- Strict mode enabled

## Example Schema

All examples use the same normalized OLTP schema:

### Entity Relationship

```
Customer (1) ──→ (N) Order (1) ──→ (N) OrderItem (N) ──→ (1) Product
```

### Tables

**Customer**
- id (PK)
- email
- name
- country
- city
- createdAt

**Product**
- id (PK)
- name
- category
- price
- createdAt

**Order**
- id (PK)
- customerId (FK)
- orderDate
- status
- total

**OrderItem**
- id (PK)
- orderId (FK)
- productId (FK)
- quantity
- price

### OLAP Transformation

**Dimensions:**
1. Customer Dimension (id, name, email, country, city)
2. Product Dimension (id, name, category, price)

**Facts:**
1. Sales Fact (quantity, price, customerId, productId, orderDate)

## Extension Points

### Adding a New ORM

1. Create new app: `apps/new-orm-example/`
2. Add dependency on `@oltp-olap/shared: workspace:*`
3. Implement same schema using ORM-specific syntax
4. Extract data using ORM APIs
5. Use shared transformers to convert to OLAP
6. Display analytics

### Adding New Transformations

To add new transformation types to the shared package:

1. Define new configuration interface in `types.ts`
2. Implement transformation method in `transformers.ts`
3. Export from `index.ts`
4. Update examples to use new transformation

### Adding Time Dimensions

To add time-based analysis:

1. Create `TimeDimension` type in shared package
2. Add `transformToTimeDimension` method
3. Include timestamp fields in fact configurations
4. Aggregate by time periods (day, week, month, year)

## Performance Considerations

### Transformation Performance

- Transformations are in-memory operations
- O(n) complexity for dimension/fact transforms
- O(n*m) for aggregations (n facts, m unique dimension keys)
- For large datasets, consider streaming or batching

### ORM Performance

Each ORM has different performance characteristics:
- **Prisma**: Generated client, optimized queries
- **Drizzle**: Lightweight, minimal overhead
- **TypeORM**: Flexible but can be slower for complex queries
- **Sequelize**: Mature but heavier runtime

### Build Performance

pnpm workspaces provide:
- Fast rebuilds with incremental compilation
- Parallel execution with `--parallel` flag
- Efficient dependency resolution
- Shared node_modules via symlinks

## Testing Strategy

Currently, examples are runnable demonstrations. To add tests:

1. **Unit Tests** for shared transformers
   - Test `transformToDimension` with various inputs
   - Test `transformToFact` with edge cases
   - Test `aggregateFacts` with different aggregation types

2. **Integration Tests** for ORM examples
   - Seed data → Transform → Assert expected output
   - Test end-to-end data flow

3. **Snapshot Tests**
   - Capture expected transformation outputs
   - Detect unintended changes

## Security Considerations

- No sensitive data in examples (all synthetic)
- SQLite in-memory/local files only
- No network access required
- No authentication/authorization implemented

## Future Enhancements

Possible additions to the project:

1. **Slowly Changing Dimensions (SCD)**
   - Track historical changes in dimensions
   - Implement SCD Type 2 (with valid_from/valid_to)

2. **Incremental Loading**
   - Extract only changed records
   - Merge into existing OLAP structures

3. **Real OLAP Database Integration**
   - ClickHouse connector
   - BigQuery integration
   - Snowflake loader

4. **Complex Fact Tables**
   - Inventory snapshots
   - Factless fact tables
   - Multiple fact tables with conformed dimensions

5. **Data Validation**
   - Schema validation
   - Data quality checks
   - Referential integrity validation

6. **Performance Optimization**
   - Streaming transformations
   - Parallel processing
   - Incremental aggregation

## References

- [Kimball Dimensional Modeling](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/)
- [Star Schema Design](https://en.wikipedia.org/wiki/Star_schema)
- [OLAP vs OLTP](https://aws.amazon.com/compare/the-difference-between-olap-and-oltp/)
- [Data Warehouse Toolkit](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/books/data-warehouse-dw-toolkit/)
