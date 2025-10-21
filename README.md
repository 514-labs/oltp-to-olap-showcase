# OLTP to OLAP Showcase

**Transform TypeScript ORM models to ClickHouse-optimized OLAP tables**

A monorepo demonstrating how to leverage TypeScript type inference from ORM data models and use MooseStack OLAP patterns to generate ClickHouse-optimized analytical tables.

## Overview

This project showcases how to:
1. **Infer TypeScript types** from ORM model definitions (Prisma, Drizzle, TypeORM, Sequelize)
2. **Generate ClickHouse schemas** optimized for OLAP workloads using MooseStack patterns
3. **Transform OLTP data** to dimensional star schemas (dimensions + facts)
4. **Deploy to ClickHouse** with automatically generated DDL and deployment scripts

Each package demonstrates the complete pipeline from ORM types → OLAP tables for a different TypeScript ORM.

## Documentation

- **[SETUP.md](./SETUP.md)** - Detailed setup and installation guide
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - 🆕 Guide to type inference & ClickHouse integration
- **[API.md](./API.md)** - Complete API reference for `@oltp-olap/shared`
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Architecture and design decisions
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines

## Key Features

✨ **Type-Safe Schema Generation** - Leverage TypeScript's type system to generate ClickHouse schemas from ORM models

🚀 **MooseStack OLAP Integration** - Use industry-standard patterns for OLAP table creation

📊 **ClickHouse Optimized** - Generate tables with proper engines, partitioning, and ordering for analytical workloads

🔄 **Star Schema Transformation** - Automatically convert OLTP models to dimensions and facts

📦 **Multi-ORM Support** - Works with Prisma, Drizzle, TypeORM, and Sequelize

🛠️ **Deployment Ready** - Generate deployment scripts and DDL for production

### What's Inside

**Packages:**
- **`@oltp-olap/shared`** - Core utilities with MooseStack OLAP integration
  - Type inference utilities
  - ClickHouse schema generator
  - Star schema builder (dimensions + facts)
  - Deployment script generator

**Apps:**
- **Prisma Example** - Type inference from Prisma Client + ClickHouse generation
- **Drizzle Example** - Drizzle schema types → ClickHouse tables
- **TypeORM Example** - TypeORM entities → OLAP optimization
- **Sequelize Example** - Sequelize models → ClickHouse deployment

## Quick Start

### 1. Install Dependencies

```bash
cd oltp-to-olap-showcase
pnpm install
```

### 2. Run the Prisma Example

```bash
# Generate Prisma Client
pnpm --filter @oltp-olap/prisma-example run prisma:generate

# Push schema to SQLite
cd apps/prisma-example
pnpm exec prisma db push

# Run the complete example
pnpm run dev
```

### 3. See the Output

The example will:
1. ✅ Seed OLTP data (customers, products, orders)
2. ✅ Transform to OLAP structures (dimensions & facts)
3. ✅ Perform analytics (sales by product, sales by customer)
4. ✅ **Generate ClickHouse schemas** from inferred types
5. ✅ **Output deployment-ready DDL and scripts**

### Example Output

```sql
-- Generated ClickHouse Dimension
CREATE TABLE IF NOT EXISTS dim_customer (
  id UInt64,
  email LowCardinality(String),
  name LowCardinality(String),
  country LowCardinality(String),
  city LowCardinality(String),
  createdAt DateTime
)
ENGINE = ReplacingMergeTree()
ORDER BY (id)
PRIMARY KEY (id);

-- Generated ClickHouse Fact Table
CREATE TABLE IF NOT EXISTS fact_sales (
  quantity UInt64,
  price Float64,
  customerId UInt64,
  productId UInt64,
  orderDate DateTime
)
ENGINE = MergeTree()
ORDER BY (orderDate, customerId, productId)
PARTITION BY toYYYYMM(orderDate);
```

## Project Structure

```
oltp-to-olap-showcase/
├── packages/
│   └── shared/              # Shared OLAP transformation utilities
│       └── src/
│           ├── types.ts     # Common type definitions
│           └── transformers.ts  # OLAP transformation logic
├── apps/
│   ├── prisma-example/      # Prisma ORM example
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/
│   │       └── index.ts
│   ├── drizzle-example/     # Drizzle ORM example
│   │   └── src/
│   │       ├── schema.ts
│   │       └── index.ts
│   ├── typeorm-example/     # TypeORM example
│   │   └── src/
│   │       ├── entities/
│   │       └── index.ts
│   └── sequelize-example/   # Sequelize example
│       └── src/
│           ├── models/
│           └── index.ts
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.json
```

## OLTP vs OLAP

### OLTP (Online Transaction Processing)
- Normalized schema (3NF)
- Optimized for write operations and transactional integrity
- Many tables with foreign key relationships
- Example: E-commerce order processing system

### OLAP (Online Analytical Processing)
- Denormalized schema (star/snowflake schema)
- Optimized for read operations and complex analytical queries
- Dimensions and fact tables
- Example: Sales analytics, data warehousing

## Example Schema

Each package implements the same e-commerce OLTP schema:

### OLTP Tables
- **customers** - Customer information
- **products** - Product catalog
- **orders** - Order headers
- **order_items** - Order line items

### OLAP Transformation
The examples transform the OLTP schema into:

**Dimensions:**
- Customer Dimension (id, name, email, country, city)
- Product Dimension (id, name, category, price)

**Facts:**
- Sales Fact (quantity, price, customer_key, product_key, timestamp)

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
cd oltp-to-olap-showcase
npm install
```

### Running Examples

#### Build All Packages
```bash
npm run build
```

#### Run Individual Examples

**Prisma:**
```bash
cd apps/prisma-example
npm run prisma:generate
npm run dev
```

**Drizzle:**
```bash
cd apps/drizzle-example
npm run dev
```

**TypeORM:**
```bash
cd apps/typeorm-example
npm run dev
```

**Sequelize:**
```bash
cd apps/sequelize-example
npm run dev
```

## Key Concepts Demonstrated

### 1. OLTP Model Definition
Each ORM example shows how to define normalized relational models:
- Entity/table definitions
- Foreign key relationships
- Data types and constraints

### 2. Data Extraction
Querying OLTP data using each ORM's API:
- Simple queries
- Joins and eager loading
- Type-safe operations

### 3. Dimensional Modeling
Transforming OLTP records to OLAP structures:
- **Dimensions** - Descriptive attributes (who, what, where)
- **Facts** - Measurable events (how many, how much)
- **Dimension Keys** - Foreign key references in facts

### 4. Aggregation
Performing analytical queries on transformed data:
- Summing measures by dimension
- Averaging metrics
- Counting occurrences

## Shared Transformation API

The `@oltp-olap/shared` package provides reusable transformation utilities:

### Types
```typescript
import type {
  DimensionConfig,
  FactConfig,
  OLAPDimension,
  OLAPFact
} from '@oltp-olap/shared';
```

### Transformers
```typescript
import { OLAPTransformer } from '@oltp-olap/shared';

// Transform to dimension
const dimensions = OLAPTransformer.transformToDimension(records, config);

// Transform to facts
const facts = OLAPTransformer.transformToFact(records, config);

// Aggregate facts
const aggregated = OLAPTransformer.aggregateFacts(facts, 'dimensionKey', 'sum');
```

## ORM-Specific Highlights

### Prisma
- Schema-first approach with `schema.prisma`
- Type-safe client generation
- Intuitive relation queries

### Drizzle
- Type-safe SQL-like queries
- Lightweight and performant
- Column-level type inference

### TypeORM
- Decorator-based entity definitions
- Active Record or Data Mapper patterns
- Advanced query builder

### Sequelize
- Model-based ORM with associations
- Mature ecosystem
- Flexible configuration

## Use Cases

This pattern is useful for:
- Building data warehouses from transactional databases
- Creating reporting and analytics layers
- ETL pipeline development
- Business intelligence applications
- Time-series analysis
- Performance optimization for read-heavy workloads

## Next Steps

To extend these examples:
1. Add time dimensions (date, hour, day of week)
2. Implement slowly changing dimensions (SCD Type 2)
3. Create aggregated tables for common queries
4. Add more complex fact tables (e.g., inventory snapshots)
5. Integrate with actual OLAP databases (ClickHouse, Snowflake, BigQuery)

## Learn More

- [Star Schema](https://en.wikipedia.org/wiki/Star_schema)
- [Kimball Dimensional Modeling](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/)
- [OLAP vs OLTP](https://aws.amazon.com/compare/the-difference-between-olap-and-oltp/)

## License

MIT
