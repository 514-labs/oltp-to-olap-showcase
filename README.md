# OLTP to OLAP Showcase

**Real-time CDC pipeline: PostgreSQL (TypeORM/SQLAlchemy) → Redpanda → Moose → ClickHouse**

Stream changes from your OLTP database to OLAP analytics in real-time using Change Data Capture. **Two complete implementations** showing the same architecture with different ORMs!

## 🎯 What This Is

Two complete working examples of OLTP → OLAP with CDC:

### TypeScript/TypeORM Example
- **TypeORM entities** (OLTP) → **Moose OlapTables** (OLAP)
- Express API with Scalar OpenAPI docs
- Port 3000

### Python/SQLAlchemy Example
- **SQLAlchemy models** (OLTP) → **Moose OlapTables** (OLAP)
- FastAPI with auto-generated Swagger docs
- Port 3002

**Both feature:**
- **Real-time CDC** using Redpanda Connect PostgreSQL CDC connector
- **Automatic denormalization** for fast analytics
- **Identical CDC pipeline architecture**

**Architecture:** PostgreSQL → Redpanda Connect → Redpanda → Moose Flows → ClickHouse

## 🚀 Quick Start

⚠️ **Requires Redpanda Enterprise License** - [Get a free 30-day trial](https://redpanda.com/try-enterprise)

Choose your preferred stack:

### Option 1: TypeScript + TypeORM

```bash
# Clone and install
git clone <your-repo-url>
cd oltp-to-olap-showcase
pnpm install

# Navigate to the TypeORM example
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

**Visit:**
- API: http://localhost:3000
- API Docs: http://localhost:3000/reference
- Test Client: http://localhost:3001

### Option 2: Python + SQLAlchemy

```bash
# Clone and install
git clone <your-repo-url>
cd oltp-to-olap-showcase

# Navigate to the SQLAlchemy example
cd apps/sqlalchemy-example

# Create virtual environment and install dependencies
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -e .

# Set your Redpanda license
export REDPANDA_LICENSE="your_license_key_here"

# Terminal 1: Start PostgreSQL
./start-oltp.sh

# Terminal 2: Start Moose (keeps running)
moose dev

# Terminal 3: Start FastAPI application
python -m uvicorn src.main:app --reload --port 3002
```

**Visit:**
- API: http://localhost:3002
- API Docs: http://localhost:3002/docs
- ReDoc: http://localhost:3002/redoc

**What you'll see in both:**

- PostgreSQL with ORM models (TypeORM/SQLAlchemy)
- CDC streaming changes in real-time
- ClickHouse tables automatically updated
- REST API with interactive documentation

## 📖 Documentation

### Getting Started

**TypeScript/TypeORM:**
- **[TypeORM Example README](apps/typeorm-example/README.md)** - Complete setup guide
- **[Quick Start Guide](apps/typeorm-example/docs/MOOSE_CDC_QUICKSTART.md)** - 5-minute setup
- **[License Setup](apps/typeorm-example/LICENSE_SETUP.md)** - Get your Redpanda license

**Python/SQLAlchemy:**
- **[SQLAlchemy Example README](apps/sqlalchemy-example/README.md)** - Complete setup guide
- **[SQLAlchemy to OLAP Guide](apps/sqlalchemy-example/docs/SQLALCHEMY_TO_OLAP_GUIDE.md)** - Conversion patterns
- **[Setup Summary](apps/sqlalchemy-example/SETUP_SUMMARY.md)** - What was created

### Detailed Guides (TypeORM)

- **[Complete Setup Guide](apps/typeorm-example/docs/SETUP_GUIDE.md)** - Step-by-step with troubleshooting
- **[CDC Pipeline Design](apps/typeorm-example/docs/CDC_PIPELINE_DESIGN.md)** - Architecture deep dive
- **[OLAP Conversion Guide](apps/typeorm-example/docs/OLAP_CONVERSION_GUIDE.md)** - TypeORM → Moose patterns
- **[Documentation Index](apps/typeorm-example/docs/README.md)** - Complete docs

## 🏗️ Project Structure

```
oltp-to-olap-showcase/
├── apps/
│   ├── typeorm-example/      ✅ TypeScript/Node.js CDC demo
│   │   ├── src/              # TypeORM OLTP entities & API
│   │   ├── app/              # Moose OLAP table definitions
│   │   ├── docs/             # Complete documentation
│   │   ├── *.sh              # Setup scripts
│   │   └── *.yaml            # Docker compose configs
│   │
│   ├── sqlalchemy-example/   ✅ Python CDC demo
│   │   ├── src/              # SQLAlchemy OLTP models & API
│   │   ├── app/              # Moose OLAP table definitions
│   │   ├── docs/             # Conversion guide
│   │   └── *.yaml            # Docker compose configs
│   │
│   └── test-client/          ✅ React UI for testing
│       └── src/              # Test client app
│
├── packages/                 (shared utilities)
└── README.md                 👈 You are here
```

## 🎓 How It Works

### 1. OLTP Models

**TypeORM (TypeScript):**
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

**SQLAlchemy (Python):**
```python
# src/models/order.py
class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))

    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")
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

**Common Infrastructure:**
- **CDC:** Redpanda Connect (PostgreSQL CDC connector)
- **Streaming:** Redpanda (Kafka API)
- **OLAP:** Moose + ClickHouse
- **Test Client:** React + Vite + shadcn/ui

**TypeORM Example:**
- **OLTP:** PostgreSQL + TypeORM
- **API:** Express + Scalar (OpenAPI docs)
- **Language:** TypeScript

**SQLAlchemy Example:**
- **OLTP:** PostgreSQL + SQLAlchemy 2.0
- **API:** FastAPI + Uvicorn + Pydantic
- **Language:** Python 3.10+

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

**Framework Documentation:**
- [Moose Documentation](https://docs.fiveonefour.com/moose/)
- [Redpanda Connect](https://docs.redpanda.com/redpanda-connect/)
- [ClickHouse Docs](https://clickhouse.com/docs/)

**ORM & API Frameworks:**
- [TypeORM](https://typeorm.io/)
- [SQLAlchemy](https://docs.sqlalchemy.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Express](https://expressjs.com/)

---

**Ready to get started?** Choose your stack:
- 🟦 [TypeScript/TypeORM Example](apps/typeorm-example/README.md)
- 🐍 [Python/SQLAlchemy Example](apps/sqlalchemy-example/README.md)
