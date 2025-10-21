# TypeORM → Moose OLAP Migration Demo

This demo shows how to migrate **TypeORM schemas (OLTP)** to **Moose OlapTables (OLAP)** for ClickHouse analytics. It demonstrates the type adaptations needed to transform normalized relational entities into denormalized analytical tables.

## What This Demo Shows

**Core Concept:** Translate TypeORM entity classes → Moose OlapTable type definitions

- **TypeORM Entities** (`src/entities/`) - Normalized OLTP schema with relationships
- **Moose OlapTables** (`app/index.ts`) - Denormalized OLAP schema for ClickHouse
- **Type Adaptations** - Remove relations, convert IDs to `UInt64`, flatten structures
- **Sample API** - Generate test data in SQLite to demonstrate the concept
- **Scalar UI** - Interactive API documentation at `/reference`

## Quick Start

```bash
# From repository root
pnpm install

# Navigate to this example
cd apps/typeorm-example

# Start the API server
pnpm dev

# Start Moose dev server (Local ClickHouse)
moose dev
```

Visit:

- **API:** http://localhost:3000
- **Scalar UI:** http://localhost:3000/reference

## Key Type Adaptations (`app/index.ts`)

The demo shows how to adapt TypeORM entities for OLAP:

### 1. Remove Relations

TypeORM entities use bidirectional relationships:

```typescript
// src/entities/Customer.ts (OLTP)
@Entity()
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(() => Order, (order) => order.customer)
  orders: Order[]; // ❌ Relations not needed in OLAP
}
```

Moose OlapTables flatten to scalar values:

```typescript
// app/index.ts (OLAP)
type OlapCustomer = Omit<InstanceType<typeof Customer>, 'id' | 'orders'> & {
  id: UInt64; // ✅ Foreign keys as scalars
};
```

### 2. Convert IDs to UInt64

ClickHouse uses unsigned integers for efficiency:

```typescript
type OlapOrder = Omit<
  InstanceType<typeof Order>,
  'id' | 'items' | 'customer' // Remove relations
> & {
  id: UInt64; // Convert primary key
  customerId: number; // Keep foreign key as scalar
};
```

### 3. Define OlapTables

```typescript
export const OlapCustomer = new OlapTable<OlapCustomer>('customer', {
  orderByFields: ['id'],
});

export const OlapOrder = new OlapTable<OlapOrder>('order', {
  orderByFields: ['id'],
});
```

## Project Structure

```
apps/typeorm-example/
├── src/
│   ├── entities/              # TypeORM OLTP entities
│   │   ├── Customer.ts        # Customer with @OneToMany orders
│   │   ├── Order.ts           # Order with @ManyToOne customer
│   │   ├── Product.ts         # Product with @OneToMany orderItems
│   │   └── OrderItem.ts       # OrderItem with relations
│   └── index.ts               # Express API (generates sample data)
├── app/
│   └── index.ts               # 🎯 Moose OlapTable definitions
├── typeorm.db                 # SQLite OLTP database
└── moose.config.toml          # Moose configuration
```

## Testing the API

Use the **Scalar UI** at http://localhost:3000/reference or curl:

```bash
# Create a customer
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","country":"USA","city":"SF"}'

# Create a product
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Widget","category":"Electronics","price":99.99}'

# View all customers
curl http://localhost:3000/api/customers | jq
```

## What's Missing for Production

This is a **type-level demonstration**. To production-ready OLTP→OLAP sync, you need:

### 1. **Change Data Capture (CDC)**

- Real-time streaming from OLTP to OLAP (Debezium, Kafka, etc.)
- This demo manually defines types but doesn't sync data

### 2. **Data Transformation Pipeline**

- Moose Flows to denormalize joined data
- Handle incremental updates and deletes
- Aggregate calculations for fact tables

### 3. **Schema Evolution**

- Handle TypeORM migrations → Moose schema changes
- Version compatibility between OLTP/OLAP

### 4. **Production Infrastructure**

- Real PostgreSQL/MySQL instead of SQLite
- ClickHouse cluster deployment
- Monitoring and alerting

### 5. **Data Quality**

- Validation between source and target
- Deduplication strategies
- Late-arriving data handling

## Technologies

- **TypeORM** 0.3.17 - OLTP ORM layer
- **Moose** 0.6.144 - OLAP table definitions
- **Express** 4.18.2 - Sample API server
- **Scalar** 0.8.22 - Interactive API documentation
- **better-sqlite3** 11.6.0 - Embedded OLTP database

## Learn More

- [Repository Root README](../../README.md) - Complete project overview
- [TypeORM Documentation](https://typeorm.io/)
- [Moose Documentation](https://docs.moosejs.com/)
- [ClickHouse Documentation](https://clickhouse.com/docs/)

## License

MIT
