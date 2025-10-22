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

⚠️ **Requires [Redpanda Enterprise License](./docs/LICENSE_SETUP.md)** - Free 30-day trial available

### 1. Set License

```bash
export REDPANDA_LICENSE="your_license_key_here"
```

### 2. Start Infrastructure

```bash
# Terminal 1: Start Moose (keeps running)
moose dev
```

**Expected:** `⏳ Waiting for tables to be created by TypeORM API...`

### 3. Start OLTP Application

```bash
# Terminal 2: Start PostgreSQL and API
pnpm start-oltp  # Starts PostgreSQL
pnpm dev         # Starts API server
```

**What happens:**

- PostgreSQL starts with logical replication enabled
- Tables created via TypeORM
- CDC publication created automatically
- Redpanda Connect starts streaming changes
- ✨ Your CDC pipeline is live!

### 4. Test the Pipeline

```bash
# Terminal 3: Start test client (optional)
cd ../test-client
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

### 5. Query ClickHouse

```bash
# Connect to ClickHouse
docker exec -it moose-clickhouse clickhouse-client -u panda --password pandapass

# Query denormalized data
SELECT * FROM local.order_fact LIMIT 10;
```

## 📖 Documentation

### Essential Guides

- **[Quick Start](docs/MOOSE_CDC_QUICKSTART.md)** - Get running in 5 minutes
- **[License Setup](LICENSE_SETUP.md)** - Get your Redpanda license
- **[Complete Setup Guide](docs/SETUP_GUIDE.md)** - Detailed setup with troubleshooting

### Architecture & Design

- **[CDC Pipeline Design](docs/CDC_PIPELINE_DESIGN.md)** - How the CDC pipeline works
- **[OLAP Conversion Guide](docs/OLAP_CONVERSION_GUIDE.md)** - TypeORM → Moose patterns
- **[Fact Table Strategy](docs/FACT_TABLE_STRATEGY.md)** - Denormalization patterns
- **[Documentation Index](docs/README.md)** - All documentation

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
├── app/
│   ├── index.ts            # Moose OLAP table definitions
│   └── streams/            # (Auto-generated streaming functions)
│
├── docs/                   # Complete documentation
│
├── docker-compose.oltp.yaml           # PostgreSQL service
├── docker-compose.dev.override.yaml   # CDC services
├── redpanda-connect.yaml              # CDC configuration
├── moose.config.toml                  # Moose settings
│
├── start-oltp.sh           # Start OLTP (PostgreSQL + setup)
├── moose-cdc-setup.sh      # CDC setup hook (auto-run by Moose)
└── init-postgres.sh        # PostgreSQL init (auto-run by Docker)
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
// app/index.ts
export interface OrderFact {
  order_id: UInt64;
  customer_id: UInt64;
  customer_name: string; // Denormalized!
  customer_email: string; // Denormalized!
  status: string;
  total: Float64;
  order_date: DateTime;
}

export const OrderFact = new OlapTable<OrderFact>('order_fact', {
  orderByFields: ['order_date', 'order_id'],
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

**Solution:** Run `pnpm dev` to start the API and create tables

### Redpanda Connect won't start

**Solution:** Check license is set: `echo $REDPANDA_LICENSE`

### Publication errors

**Solution:** See [Troubleshooting Guide](docs/SETUP_GUIDE.md#troubleshooting)

### More issues?

Check the **[Complete Setup Guide](docs/SETUP_GUIDE.md)** for detailed troubleshooting.

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
pnpm start-oltp    # Start PostgreSQL
pnpm stop-oltp     # Stop PostgreSQL
pnpm setup-db      # Initialize database tables
pnpm dev           # Start API server (dev mode)
pnpm build         # Build TypeScript
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

**Need help?** Check the **[Documentation Index](docs/README.md)** or open an issue.
