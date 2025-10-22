# OLTP to OLAP Showcase

**Real-time CDC pipeline: PostgreSQL (TypeORM) → Redpanda → Moose → ClickHouse**

Stream changes from your OLTP database to OLAP analytics in real-time using Change Data Capture.

## 🎯 What This Is

A complete working example of:

- **TypeORM entities** (OLTP) → **Moose OlapTables** (OLAP)
- **Real-time CDC** using Redpanda Connect PostgreSQL CDC connector
- **Automatic denormalization** for fast analytics
- **Test client** to trigger CDC events

**Architecture:** PostgreSQL → Redpanda Connect → Redpanda → Moose Flows → ClickHouse

## 🚀 Quick Start

⚠️ **Requires Redpanda Enterprise License** - [Get a free 30-day trial](https://redpanda.com/try-enterprise)

```bash
# Clone and install
git clone <your-repo-url>
cd oltp-to-olap-showcase
pnpm install

# Navigate to the TypeORM CDC example
cd apps/typeorm-example

# Set your Redpanda license
export REDPANDA_LICENSE="your_license_key_here"

# Terminal 1: Start Moose (ClickHouse + Redpanda + CDC)
moose dev

# Terminal 2: Start OLTP application
pnpm start-oltp  # Starts PostgreSQL
pnpm dev         # Starts API server

# Terminal 3: Start test client (optional)
cd ../test-client
pnpm dev
```

**What you'll see:**

- PostgreSQL with TypeORM entities
- CDC streaming changes in real-time
- ClickHouse tables automatically updated
- Test UI to create/update/delete orders

**Visit:**

- API: http://localhost:3000
- API Docs: http://localhost:3000/reference
- Test Client: http://localhost:3001

## 📖 Documentation

### Getting Started

- **[TypeORM Example](apps/typeorm-example/README.md)** - Main project README
- **[Quick Start Guide](apps/typeorm-example/docs/MOOSE_CDC_QUICKSTART.md)** - 5-minute setup
- **[License Setup](apps/typeorm-example/LICENSE_SETUP.md)** - Get your Redpanda license

### Detailed Guides

- **[Complete Setup Guide](apps/typeorm-example/docs/SETUP_GUIDE.md)** - Step-by-step with troubleshooting
- **[CDC Pipeline Design](apps/typeorm-example/docs/CDC_PIPELINE_DESIGN.md)** - Architecture deep dive
- **[OLAP Conversion Guide](apps/typeorm-example/docs/OLAP_CONVERSION_GUIDE.md)** - TypeORM → Moose patterns
- **[Documentation Index](apps/typeorm-example/docs/README.md)** - Complete docs

## 🏗️ Project Structure

```
oltp-to-olap-showcase/
├── apps/
│   ├── typeorm-example/      ✅ Complete CDC demo
│   │   ├── src/              # TypeORM OLTP entities & API
│   │   ├── app/              # Moose OLAP table definitions
│   │   ├── docs/             # Complete documentation
│   │   ├── *.sh              # Setup scripts
│   │   └── *.yaml            # Docker compose configs
│   │
│   └── test-client/          ✅ React UI for testing
│       └── src/              # Test client app
│
├── packages/                 (shared utilities)
└── README.md                 👈 You are here
```

## 🎓 How It Works

### 1. OLTP Models (TypeORM)

```typescript
// src/entities/Order.ts
@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Customer)
  customer: Customer;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];
}
```

### 2. CDC Stream (PostgreSQL WAL)

PostgreSQL logical replication captures every INSERT, UPDATE, DELETE:

```json
{
  "table": "orders",
  "operation": "insert",
  "before": null,
  "after": {
    "id": 1,
    "customer_id": 123,
    "status": "pending",
    "total": 99.99
  }
}
```

### 3. OLAP Tables (Moose)

Denormalized for analytics - no JOINs needed:

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

### 4. Fast Analytics (ClickHouse)

```sql
-- No JOINs! Everything pre-joined
SELECT
  customer_name,
  COUNT(*) as order_count,
  SUM(total) as total_revenue
FROM order_fact
WHERE order_date >= today() - INTERVAL 30 DAY
GROUP BY customer_name
ORDER BY total_revenue DESC;
```

## 🔄 Data Flow

```
┌─────────────┐   CDC Events   ┌──────────────┐   Kafka Topic   ┌─────────────┐
│ PostgreSQL  │──────WAL──────>│   Redpanda   │────────────────>│  Moose      │
│  (TypeORM)  │                │   Connect    │                 │  Functions  │
└─────────────┘                └──────────────┘                 └─────┬───────┘
                                                                      │
                                                                      │ Transform
                                                                      ▼
                                                               ┌────────────┐
                                                               │ ClickHouse │
                                                               │   (OLAP)   │
                                                               └────────────┘
```

Every database change is:

1. **Captured** by PostgreSQL WAL
2. **Streamed** via Redpanda Connect
3. **Transformed** by Moose flows
4. **Stored** in ClickHouse

## 🎯 Use Cases

**When to use this pattern:**

✅ Slow analytical queries on your OLTP database
✅ Need real-time analytics without impacting transactions
✅ Want to separate operational and analytical workloads
✅ Need to denormalize data for fast queries
✅ Building dashboards or reports

**Real-world scenarios:**

- Customer analytics dashboards
- Order/revenue metrics
- Product performance reports
- Real-time monitoring
- Audit trails

## 🛠️ Technology Stack

- **OLTP:** PostgreSQL + TypeORM
- **CDC:** Redpanda Connect (PostgreSQL CDC connector)
- **Streaming:** Redpanda (Kafka API)
- **OLAP:** Moose + ClickHouse
- **API:** Express + Scalar (OpenAPI docs)
- **Test Client:** React + Vite + shadcn/ui

## 📚 Key Concepts

### Change Data Capture (CDC)

Captures every database change at the transaction log level (PostgreSQL WAL). No polling, no triggers - just pure log-based replication.

### Denormalization

Pre-joining related data to avoid expensive JOINs in analytics. Orders include customer names inline instead of requiring joins.

### Star Schema

Dimensional modeling with fact tables (orders) and dimension tables (customers, products). Optimized for analytical queries.

### Real-time Sync

Changes appear in ClickHouse within seconds, not hours. Perfect for live dashboards and real-time reporting.

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT

## 🔗 Learn More

- [Moose Documentation](https://docs.fiveonefour.com/moose/)
- [Redpanda Connect](https://docs.redpanda.com/redpanda-connect/)
- [ClickHouse Docs](https://clickhouse.com/docs/)
- [TypeORM](https://typeorm.io/)

---

**Ready to get started?** → [TypeORM Example](apps/typeorm-example/README.md)
