# TypeORM CDC Example

**Real-time PostgreSQL CDC → Moose → ClickHouse**

Transform TypeORM entities into denormalized OLAP tables with real-time CDC replication.

## 🎯 What This Does

- ✅ TypeORM entities automatically streamed to ClickHouse
- ✅ Real-time CDC using Redpanda Connect
- ✅ Denormalized star schema for fast analytics
- ✅ Express API with OpenAPI docs
- ✅ React test client included

**Architecture:** PostgreSQL → Redpanda Connect → Redpanda → Moose Flows → ClickHouse

## 🚀 Quick Start

⚠️ **Requires a Redpanda Enterprise License** — grab a free 30-day trial at [redpanda.com/try-enterprise](https://redpanda.com/try-enterprise)

### 1. Set License

```bash
export REDPANDA_LICENSE="your_license_key_here"
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Run the setup script

```bash
# Terminal 1: Start PostgreSQL and configure CDC (interactive)
./setup.sh
```

The script brings up PostgreSQL, walks you through running `pnpm setup-db`, and configures the CDC publication and replication slot.

### 4. Start Moose (CDC pipeline) and the API

```bash
# Terminal 2: Start Moose (brings up Redpanda Connect + ClickHouse sinks)
moose dev

# Terminal 3: Start the API server (keeps running)
pnpm dev
```

You should see Moose log CDC activity as you interact with the API.

### 5. Test the Pipeline

```bash
# Terminal 4: Start test client (optional)
cd ../test-client
pnpm install
pnpm dev
```

Visit http://localhost:3001 to create/update/delete orders and watch CDC in action!

**Or use the API directly:**

```bash
# Create a customer
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User", "country": "USA", "city": "NYC"}'

# Create a product
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Laptop", "category": "Electronics", "price": 999.99}'

# Create an order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId": 1, "status": "pending", "total": 999.99}'
```

### 6. Query ClickHouse

```bash
# Connect to ClickHouse
docker exec -it moose-clickhouse clickhouse-client -u panda --password pandapass

# Query denormalized data
SELECT * FROM local.order_fact LIMIT 10;
```

## 📖 Documentation

- [Repository Quick Start](../../docs/quickstart.md) — End-to-end setup across projects
- [Docker Setup Guide](../../docs/docker-guide.md) — Ports, containers, and common commands
- [Troubleshooting Guide](../../TROUBLESHOOTING.md) — Common CDC issues and fixes
- [Test Client README](../test-client/README.md) — Drive writes and watch CDC in action

## 🏗️ Project Structure

```
typeorm-example/
├── src/
│   ├── entities/           # TypeORM OLTP entities
│   │   ├── Customer.ts
│   │   ├── Product.ts
│   │   ├── Order.ts
│   │   └── OrderItem.ts
│   ├── index.ts            # Express API server
│   ├── openapi.ts          # OpenAPI specification
│   └── setup-db.ts         # Database initialization
│
├── moose/
│   ├── index.ts            # Moose entry point (exports sources/transforms/sinks)
│   ├── transformations.ts  # CDC event routing and processing
│   ├── sinkTables.ts       # ClickHouse table definitions
│   ├── sinkTopics.ts       # Moose streams into ClickHouse
│   ├── materializedViews.ts# Optional enrichment views
│   └── sources/            # Auto-generated Redpanda topics
│
├── config/                 # Moose dynamic config templates
│
├── docker-compose.oltp.yaml           # PostgreSQL service
├── docker-compose.dev.override.yaml   # CDC services
├── redpanda-connect.yaml              # CDC configuration
├── moose.config.toml                  # Moose settings
│
├── setup.sh                # Interactive CDC setup script
├── Makefile                # Convenient aliases for setup.sh
└── package.json            # Example scripts and dependencies
```

## 🎓 How It Works

### TypeORM Entities (OLTP)

```typescript
// src/entities/Order.ts
@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @ManyToOne(() => Customer)
  customer: Customer;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];
}
```

### Moose OLAP Tables

```typescript
// moose/sinkTables.ts
export const OrderItemTable = new OlapTable<OrderItemFact & CdcFields>('fact_order_item', {
  orderByFields: ['id', 'orderId', 'productId'],
  engine: ClickHouseEngines.ReplacingMergeTree,
  ver: 'lsn',
  isDeleted: 'is_deleted',
});
```

### CDC Event Flow

```
TypeORM           PostgreSQL        Redpanda          Moose            ClickHouse
Insert   ──────>   WAL      ──────>  Connect  ──────>  Flow   ──────>  Table
Order              Capture           Stream            Transform         Insert
```

## 🚨 Common Issues

### "Waiting for tables" persists

**Solution:** Run `pnpm setup-db` to create tables, then restart `pnpm dev`

### Redpanda Connect won't start

**Solution:** Check license is set: `echo $REDPANDA_LICENSE`

### Publication errors

**Solution:** See the [repository Troubleshooting Guide](../../TROUBLESHOOTING.md)

### More issues?

Check the [repo Troubleshooting Guide](../../TROUBLESHOOTING.md) for detailed diagnostics or open an issue with logs from `./setup.sh status`.

## 🔗 Useful Links

**API Endpoints:**

- API Server: http://localhost:3000
- API Documentation: http://localhost:3000/reference
- Redpanda Connect Health: http://localhost:4195/ready

**Admin UIs:**

- Moose Console: http://localhost:5001
- Test Client: http://localhost:3001

## 📦 Available Scripts

```bash
pnpm setup-db   # Initialize database tables using TypeORM entities
pnpm dev        # Start API server (dev mode)
pnpm build      # Build TypeScript output
pnpm clean      # Remove build artifacts
moose dev       # Start Moose (from this directory)
```

## 🛠️ Technology Stack

- **OLTP:** PostgreSQL 15 + TypeORM 0.3
- **CDC:** Redpanda Connect (Enterprise) + PostgreSQL CDC connector
- **Streaming:** Redpanda (Kafka-compatible)
- **OLAP:** Moose 0.6 + ClickHouse
- **API:** Express + Scalar OpenAPI docs
- **Language:** TypeScript 5

## 📚 Learn More

- [Moose Documentation](https://docs.fiveonefour.com/moose/)
- [Redpanda Connect PostgreSQL CDC](https://docs.redpanda.com/redpanda-connect/components/inputs/postgres_cdc/)
- [PostgreSQL Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)
- [ClickHouse Documentation](https://clickhouse.com/docs/)
- [TypeORM Documentation](https://typeorm.io/)

---

**Need help?** Check the **[Documentation Index](../../docs/README.md)** or open an issue.
