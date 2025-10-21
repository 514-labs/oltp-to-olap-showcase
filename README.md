# OLTP to OLAP Showcase

**"Just OLAP It" - Migration patterns for moving analytics from your OLTP database to ClickHouse**

## Inspiration

This repository was inspired by a keynote presentation at [OpenHouse NYC](https://clickhouse.com/openhouse/nyc), where the Ramp engineering team shared their approach to database performance optimization.

Their mantra: **For every slow query on PostgreSQL, "just OLAP it."**

Instead of optimizing complex analytical queries in their OLTP database, Ramp migrates them to ClickHouse. This keeps their transactional database fast while giving analytics queries the columnar, OLAP-optimized environment they need.

## The Goal

This repository demonstrates **how to "just OLAP it"** for your TypeScript stack. We show migration patterns for popular ORMs (TypeORM, Prisma, Drizzle, Sequelize), so you can quickly translate your existing OLTP models to OLAP tables using [Moose OLAP](https://docs.fiveonefour.com/moose/olap) and ClickHouse.

**The process:**

1. **Start with** your existing ORM models (TypeORM entities, Prisma schemas, etc.)
2. **Translate** them to Moose OlapTable types (remove relations, flatten structures, adapt types)
3. **Deploy** to ClickHouse for blazing-fast analytical queries
4. **Keep** your OLTP database focused on transactions

Each ORM has different patterns for schema definition. This showcase provides working examples adapted to each.

## Demo Status

| ORM           | Status      | Description                                                  |
| ------------- | ----------- | ------------------------------------------------------------ |
| **TypeORM**   | ✅ Complete | Full working demo with API, Moose integration, and Scalar UI |
| **Prisma**    | 🚧 WIP      | Coming soon                                                  |
| **Drizzle**   | 🚧 WIP      | Coming soon                                                  |
| **Sequelize** | 🚧 WIP      | Coming soon                                                  |

## Quick Start

```bash
# Install dependencies
pnpm install

# Navigate to TypeORM example
cd apps/typeorm-example

# Start the API server
pnpm dev

# In a new terminal, start Moose dev server (local ClickHouse)
moose dev
```

Visit:

- **API:** http://localhost:3000
- **Scalar UI:** http://localhost:3000/reference (interactive API docs)

**What you'll see:** A working e-commerce API (Customers, Products, Orders) with TypeORM entities automatically translated to Moose OlapTables for ClickHouse analytics.

**Prerequisites:** Node.js v20-22 (⚠️ not v23+), pnpm v9+

## How It Works

### 1. OLTP Models (Your Existing Code)

TypeORM entities with decorators and relationships:

```typescript
// src/entities/Customer.ts
@Entity()
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(() => Order, (order) => order.customer)
  orders: Order[]; // Relations for transactional queries
}
```

### 2. OLAP Types (Moose Translation)

Moose OlapTable types - remove relations, convert IDs:

```typescript
// app/index.ts
type OlapCustomer = Omit<InstanceType<typeof Customer>, 'id' | 'orders'> & {
  id: UInt64; // ClickHouse-optimized unsigned int
};

export const OlapCustomer = new OlapTable<OlapCustomer>('customer', {
  orderByFields: ['id'],
});
```

### 3. Deploy to ClickHouse

```bash
moose dev  # Local ClickHouse for testing
# or
moose deploy  # Production ClickHouse
```

Now analytical queries run on ClickHouse, not your OLTP database.

## Project Structure

```
apps/
├── typeorm-example/     ✅ Complete - Full demo with API and Moose integration
├── prisma-example/      🚧 WIP
├── drizzle-example/     🚧 WIP
└── sequelize-example/   🚧 WIP
```

Each example shows:

- ORM-specific entity/model definitions (OLTP)
- Moose OlapTable type adaptations (OLAP)
- Sample API to generate test data
- Deployment patterns for ClickHouse

## Documentation

Detailed guides for each example:

- **[TypeORM Example →](apps/typeorm-example/README.md)** - Complete TypeORM + Moose guide
- **Prisma Example** - Coming soon
- **Drizzle Example** - Coming soon
- **Sequelize Example** - Coming soon

## Technology Stack

- **ORMs:** TypeORM (complete), Prisma/Drizzle/Sequelize (WIP)
- **OLAP:** Moose v0.6.144 + ClickHouse
- **API:** Express, Scalar (interactive docs)
- **Database:** SQLite (demo), PostgreSQL/MySQL (production)
- **Tooling:** TypeScript, pnpm, tsx

## What's Next?

### Production Considerations

This demo focuses on **type-level translation patterns**. For production OLTP→OLAP sync, you'll need:

1. **Change Data Capture (CDC)** - Stream changes from OLTP to OLAP (Debezium, Kafka, etc.)
2. **ETL Pipeline** - Moose Flows or scheduled jobs for data transformation
3. **Schema Evolution** - Handle ORM migrations → ClickHouse schema updates
4. **Monitoring** - Track sync lag, data quality, query performance

### Contributing

Help us complete the remaining ORM examples:

- **Prisma** - Schema definitions with `@prisma/client`
- **Drizzle** - Type-safe schema with `drizzle-orm`
- **Sequelize** - Model definitions with Sequelize ORM

See each `apps/*/README.md` for specific implementation patterns.

## Learn More

- **[Moose Documentation](https://docs.moosejs.com/)** - OLAP framework for ClickHouse
- **[ClickHouse Docs](https://clickhouse.com/docs/)** - Columnar analytical database
- **[TypeORM Docs](https://typeorm.io/)** - TypeScript ORM for SQL databases

## License

MIT
