# OLTP to OLAP Showcase

**Real-time CDC pipeline: PostgreSQL → Redpanda → Moose → ClickHouse**

Stream changes from your OLTP database to OLAP analytics in real-time using Change Data Capture. Multiple ORM implementations (TypeORM and SQLModel) showing the same architecture!

## What This Demonstrates

A complete, working example of an OLTP-to-OLAP CDC pipeline with:

- **Real-time Change Data Capture** from PostgreSQL transaction logs
- **Automatic denormalization** for fast analytical queries
- **Two production-ready implementations** (TypeORM and SQLModel)
- **Interactive test client** to see CDC in action
- **Star schema design** optimized for analytics

## Project Status

**Production-Ready:**
- **TypeORM Example** - TypeScript/Node.js with Express API (port 3000)
- **SQLModel Example** - Python/FastAPI implementation (port 3002)
  - Uses SQLModel (SQLAlchemy 2.0 + Pydantic) for unified database and validation models
  - Directory named `sqlalchemy-example` for consistency, but implementation is SQLModel
- **Test Client** - React UI for testing both backends

**Work in Progress:**
- **Drizzle Example** - WIP, not yet functional
- **Prisma Example** - WIP, not yet functional

## Architecture

```
┌─────────────────┐    WAL     ┌──────────────┐   Kafka    ┌─────────────┐
│   PostgreSQL    │──────────>│   Redpanda   │──────────>│    Moose    │
│  (TypeORM/SA)   │            │   Connect    │            │  Functions  │
└─────────────────┘            └──────────────┘            └──────┬──────┘
                                                                   │
                                                             Transform
                                                                   ↓
                                                          ┌────────────────┐
                                                          │   ClickHouse   │
                                                          │   (Analytics)  │
                                                          └────────────────┘
```

## Quick Start

**Prerequisites:**
- Docker and Docker Compose
- Node.js 18+ (for TypeORM) or Python 3.10+ (for SQLModel)
- Redpanda Enterprise License - [Get a free 30-day trial](https://redpanda.com/try-enterprise)

**New to this?** See the detailed [QUICKSTART.md](QUICKSTART.md) guide for step-by-step instructions.

### TypeScript + TypeORM

```bash
cd apps/typeorm-example

# Set Redpanda license
export REDPANDA_LICENSE="your_license_key_here"

# Terminal 1: Start infrastructure
moose dev

# Terminal 2: Start API
pnpm start-oltp && pnpm dev
```

Visit http://localhost:3000 for API and http://localhost:3000/reference for docs.

### Python + SQLModel

```bash
cd apps/sqlalchemy-example  # Named for consistency, uses SQLModel

# Set Redpanda license
export REDPANDA_LICENSE="your_license_key_here"

# Setup (first time only)
python -m venv venv
source venv/bin/activate
pip install -e .

# Terminal 1: Start PostgreSQL
./start-oltp.sh

# Terminal 2: Start infrastructure
moose dev

# Terminal 3: Start API
fastapi dev src/main.py --port 3002
```

Visit http://localhost:3002/docs for interactive API documentation.

**About SQLModel:** Created by FastAPI's author, SQLModel combines SQLAlchemy (database) and Pydantic (validation) into a single, type-safe model. See the [SQLModel guide](apps/sqlalchemy-example/docs/WHY_SQLMODEL.md) for details.

### Test the Pipeline

```bash
cd apps/test-client
pnpm install && pnpm dev
```

Visit http://localhost:3001 to create data and watch CDC in action.

## Documentation

### Getting Started
- [Quick Start Guide](QUICKSTART.md) - Get running in 5 minutes
- [TypeORM Example](apps/typeorm-example/README.md) - TypeScript implementation
- [SQLModel Example](apps/sqlalchemy-example/README.md) - Python implementation with SQLModel
- [Test Client](apps/test-client/README.md) - Interactive UI for testing

### Architecture & Design
- [CDC Pipeline Design](apps/typeorm-example/docs/CDC_PIPELINE_DESIGN.md) - How CDC works
- [OLAP Conversion Guide](apps/typeorm-example/docs/OLAP_CONVERSION_GUIDE.md) - ORM to analytics patterns
- [TypeORM Setup Guide](apps/typeorm-example/docs/SETUP_GUIDE.md) - Detailed setup with troubleshooting

## Project Structure

```
oltp-to-olap-showcase/
├── apps/
│   ├── typeorm-example/       # TypeScript/Node.js implementation
│   │   ├── src/               # TypeORM entities & Express API
│   │   ├── app/               # Moose OLAP tables
│   │   └── docs/              # Architecture guides
│   │
│   ├── sqlalchemy-example/    # Python/FastAPI implementation (uses SQLModel)
│   │   ├── src/               # SQLModel models & FastAPI
│   │   └── app/               # Moose OLAP tables
│   │
│   ├── test-client/           # React test UI
│   │
│   ├── drizzle-example/       # WIP - Not functional
│   ├── prisma-example/        # WIP - Not functional
│   └── sequelize-example/     # WIP - Not functional
│
├── QUICKSTART.md
└── README.md
```

## How It Works

### 1. OLTP Models (Normalized)

Your application uses standard ORM models with relationships:

**TypeORM:**
```typescript
@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Customer)
  customer: Customer;

  @OneToMany(() => OrderItem, item => item.order)
  items: OrderItem[];
}
```

**SQLModel (Python):**
```python
from sqlmodel import SQLModel, Field, Relationship

class Order(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    customer_id: int = Field(foreign_key="customer.id")
    customer: Customer | None = Relationship(back_populates="orders")
    # Same class works for DB table AND API validation
```

### 2. CDC Capture

PostgreSQL's Write-Ahead Log (WAL) captures every change:

```json
{
  "table": "order",
  "operation": "insert",
  "after": {"id": 1, "customer_id": 123, "status": "pending", "total": 99.99}
}
```

Redpanda Connect streams these events to Kafka topics in real-time.

### 3. Transform & Load

Moose functions transform normalized data into denormalized analytics tables:

```typescript
// Denormalize: join customer data into orders
export interface OrderFact {
  order_id: UInt64;
  customer_name: string;    // From customers table
  customer_email: string;   // From customers table
  status: string;
  total: Float64;
}
```

### 4. Fast Analytics

Query ClickHouse without expensive JOINs:

```sql
SELECT customer_name, SUM(total) as revenue
FROM order_fact
WHERE order_date >= today() - 30
GROUP BY customer_name
ORDER BY revenue DESC;
```

## Use Cases

**When to use OLTP-to-OLAP CDC:**

- Analytical queries slowing down your transactional database
- Building real-time dashboards and reports
- Need to separate operational and analytical workloads
- Want fast aggregations without complex JOINs
- Require historical data analysis alongside live transactions

**Example scenarios:**
- Revenue and sales analytics
- Customer behavior analysis
- Product performance metrics
- Real-time operational monitoring
- Audit trails and compliance reporting

## Technology Stack

**Shared Infrastructure:**
- PostgreSQL 15 with logical replication
- Redpanda Connect (CDC connector)
- Redpanda (Kafka-compatible streaming)
- Moose (stream processing)
- ClickHouse (columnar analytics database)

**TypeORM Example:**
- TypeScript + Node.js
- TypeORM 0.3
- Express + Scalar OpenAPI docs

**SQLModel Example:**
- Python 3.10+
- **SQLModel** (combines SQLAlchemy 2.0 + Pydantic v2)
- FastAPI (by same creator as SQLModel)
- Single model = database table + API validation

**Test Client:**
- React 18 + Vite
- shadcn/ui components
- Tailwind CSS

## Key Concepts

**Change Data Capture (CDC)**
Captures database changes from PostgreSQL's Write-Ahead Log. No polling, no triggers - log-based replication with minimal overhead.

**Denormalization**
Pre-joining related data for fast analytics. Instead of JOINing orders with customers at query time, customer data is embedded in the order fact table.

**Star Schema**
Fact tables (orders, order items) and dimension tables (customers, products) optimized for analytical queries and aggregations.

**Real-time Processing**
Changes appear in ClickHouse within milliseconds, enabling live dashboards and up-to-the-second reporting.

## Contributing

Contributions are welcome! This is a demonstration project showing CDC patterns with different ORMs.

**Areas for contribution:**
- Bug fixes and improvements
- Documentation enhancements
- New ORM examples (help finish Drizzle, Prisma, or Sequelize)
- Performance optimizations
- Additional test scenarios

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Learn More

**Core Technologies:**
- [Moose Documentation](https://docs.fiveonefour.com/moose/)
- [Redpanda Connect](https://docs.redpanda.com/redpanda-connect/)
- [ClickHouse Documentation](https://clickhouse.com/docs/)
- [PostgreSQL Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)

**ORMs & Frameworks:**
- [TypeORM](https://typeorm.io/) - TypeScript ORM
- [SQLModel](https://sqlmodel.tiangolo.com/) - Python ORM combining SQLAlchemy + Pydantic
- [SQLAlchemy 2.0](https://docs.sqlalchemy.org/) - Python SQL toolkit (SQLModel foundation)
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python API framework
- [Express](https://expressjs.com/) - Node.js web framework

## License

MIT

---

**Ready to get started?**
1. [Quick Start Guide](QUICKSTART.md) - 5-minute setup
2. Choose your stack: [TypeORM](apps/typeorm-example/README.md) or [SQLModel](apps/sqlalchemy-example/README.md)
3. Run the [Test Client](apps/test-client/README.md) to see CDC in action
