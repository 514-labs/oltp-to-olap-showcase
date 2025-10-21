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

🌐 **REST API with Scalar Docs** - TypeORM example includes full CRUD API with interactive Scalar documentation

⚡ **Hot Reload** - Development server with automatic restart on file changes

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

### Prerequisites

- **Node.js**: v20.x or v22.x (LTS recommended)
  - ⚠️ **Important**: Node.js v23+ has compatibility issues with native SQLite bindings
  - Use `nvm use 20` if you have nvm installed
- **pnpm**: v9.0.0 or higher
- **Git**: Any recent version

### 1. Install Dependencies

```bash
cd oltp-to-olap-showcase
pnpm install
```

### 2. Run the TypeORM Example (with API Documentation)

The TypeORM example includes a REST API with **Scalar API documentation**:

```bash
cd apps/typeorm-example
pnpm run dev
```

The server will start with auto-reload enabled. Access:
- **API**: http://localhost:3000
- **Scalar API Docs**: http://localhost:3000/reference (development only)
- **Health Check**: http://localhost:3000/health

The dev server uses `tsx watch` and will automatically reload when you save files in the `/src` directory.

### 3. Run the Prisma Example

```bash
# Generate Prisma Client
pnpm --filter @oltp-olap/prisma-example run prisma:generate

# Push schema to SQLite
cd apps/prisma-example
pnpm exec prisma db push

# Run the complete example
pnpm run dev
```

### 4. See the Output

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
- **Node.js**: v20.x or v22.x (LTS recommended, v23+ not compatible)
- **pnpm**: v9.0.0 or higher (`npm install -g pnpm`)

### Installation

```bash
cd oltp-to-olap-showcase
pnpm install
```

### Building the Monorepo

Build all packages (shared library must be built first):

```bash
# Build shared package
cd packages/shared
pnpm run build

# Or build everything from root
cd ..
pnpm run build
```

### Running Examples

#### TypeORM (REST API with Scalar Docs)
```bash
cd apps/typeorm-example
pnpm run dev

# Access:
# - API: http://localhost:3000
# - Scalar Docs: http://localhost:3000/reference
# - Health: http://localhost:3000/health
```

#### Prisma
```bash
cd apps/prisma-example
pnpm run prisma:generate
pnpm run dev
```

#### Drizzle
```bash
cd apps/drizzle-example
pnpm run dev
```

#### Sequelize
```bash
cd apps/sequelize-example
pnpm run dev
```

### Running All Apps in Parallel

From the repository root:

```bash
pnpm run dev
```

This runs all example apps simultaneously in development mode.

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

## TypeORM REST API Example

The TypeORM example includes a full REST API with CRUD operations and interactive API documentation.

### Available Endpoints

**Customers:**
- `GET /api/customers` - List all customers
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

**Products:**
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

**Orders:**
- `GET /api/orders` - List all orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

**Order Items:**
- `GET /api/order-items` - List all order items
- `GET /api/order-items/:id` - Get order item by ID
- `POST /api/order-items` - Create order item
- `PUT /api/order-items/:id` - Update order item
- `DELETE /api/order-items/:id` - Delete order item

### Scalar API Documentation

The TypeORM example includes **Scalar** for interactive API documentation:

**Development Mode:**
```bash
pnpm run dev
# Scalar available at http://localhost:3000/reference
```

**Production Mode:**
```bash
NODE_ENV=production pnpm start
# Scalar route is disabled for security
# Uses strict Content Security Policy
```

Features:
- 📖 Browse all API endpoints
- 🧪 Test API calls directly from the browser
- 📝 View request/response schemas
- 🎨 Beautiful purple theme
- 🔒 Development-only (disabled in production)

### Development Features

- **Auto-reload**: The dev server uses `tsx watch` and automatically restarts when you save files
- **Hot Module Replacement**: Changes to `/src` directory trigger instant reloads
- **Security**: Helmet middleware with environment-specific CSP policies
- **CORS**: Configured for local development

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
- **REST API with Scalar documentation**

### Sequelize
- Model-based ORM with associations
- Mature ecosystem
- Flexible configuration

## Troubleshooting

### Node.js Version Issues

**Problem**: `better-sqlite3` or `sqlite3` fails to build

**Solution**: Use Node.js LTS (v20 or v22)
```bash
nvm install 20
nvm use 20
pnpm install
```

### Scalar API Not Loading

**Problem**: CSP errors in browser console

**Solution**: Ensure you're in development mode (not production):
```bash
# Development (Scalar enabled)
pnpm run dev

# Production (Scalar disabled)
NODE_ENV=production pnpm start
```

### Workspace Linking Issues

**Problem**: `Cannot find module '@oltp-olap/shared'`

**Solution**: Build the shared package first:
```bash
cd packages/shared
pnpm run build
```

### Port Already in Use

**Problem**: Port 3000 is already occupied

**Solution**: Change the port or kill the existing process:
```bash
# Change port
PORT=3001 pnpm run dev

# Or kill existing process
lsof -i :3000
kill -9 <PID>
```

## Use Cases

This pattern is useful for:
- Building data warehouses from transactional databases
- Creating reporting and analytics layers
- ETL pipeline development
- Business intelligence applications
- Time-series analysis
- Performance optimization for read-heavy workloads
- **RESTful APIs with auto-generated documentation**

## Next Steps

To extend these examples:
1. Add time dimensions (date, hour, day of week)
2. Implement slowly changing dimensions (SCD Type 2)
3. Create aggregated tables for common queries
4. Add more complex fact tables (e.g., inventory snapshots)
5. Integrate with actual OLAP databases (ClickHouse, Snowflake, BigQuery)
6. Add authentication and authorization to the REST API
7. Deploy the TypeORM API to production with proper environment variables

## Learn More

- [Star Schema](https://en.wikipedia.org/wiki/Star_schema)
- [Kimball Dimensional Modeling](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/)
- [OLAP vs OLTP](https://aws.amazon.com/compare/the-difference-between-olap-and-oltp/)

## License

MIT
