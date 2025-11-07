# OLTP to OLAP Showcase

**Real-time CDC pipeline: PostgreSQL → Redpanda → Moose → ClickHouse**

Stream changes from your OLTP database to OLAP analytics in real-time using Change Data Capture. Five ORM implementations showing the same architecture across TypeScript and Python ecosystems!

## 🎯 New Developer? Start Here

This repository demonstrates Change Data Capture (CDC) - the practice of streaming database changes to analytics systems in real-time. Instead of polling or batch ETL jobs, CDC captures every INSERT, UPDATE, and DELETE from PostgreSQL's transaction log and pipes it to ClickHouse for lightning-fast analytics.

**Choose your path:**

1. **Learn the concepts** → Read [How It Works](#how-it-works) below
2. **Try it immediately** → Follow [Quick Start](#quick-start) (5 minutes)
3. **Understand the design** → See [CDC Transformation Architecture](apps/sqlmodel-example/docs/CDC_TRANSFORMATION_ARCHITECTURE.md)
4. **Test interactively** → Run the [Test Client](#test-the-pipeline) to see CDC in action

## What This Demonstrates

A complete, working example of an OLTP-to-OLAP CDC pipeline with:

- **Real-time Change Data Capture** from PostgreSQL transaction logs
- **Automatic denormalization** for fast analytical queries without JOINs
- **Five ORM examples** showing the same architecture across different frameworks
- **Interactive test client** with dynamic backend switching
- **Star schema design** optimized for analytics workloads
- **Interactive setup scripts** that teach CDC concepts as you configure

## Project Status

**Production-Ready:**

- ✅ **TypeORM Example** - TypeScript/Node.js with Express API (port 3000)
- ✅ **SQLModel Example** - Python/FastAPI implementation (port 3002)
- ✅ **Test Client** - React UI with in-app backend switching

**Experimental (Setup Available):**

- ⚠️ **Drizzle Example** - Basic setup working (port 3003)
- ⚠️ **Prisma Example** - Basic setup working (port 3004)

Every example includes an interactive `setup.sh` script that guides you through CDC configuration step-by-step.

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
- Node.js 18+ (for TypeScript examples) or Python 3.10+ (for Python examples)
- Redpanda Enterprise License - [Get a free 30-day trial](https://redpanda.com/try-enterprise)

### 🚀 Recommended: Interactive Setup Script

**The easiest way to get started** - each ORM example includes an interactive `setup.sh` script that teaches CDC concepts while configuring your environment:

```bash
# Choose any example (TypeORM recommended for beginners)
cd apps/typeorm-example

# Run interactive setup - it will guide you through:
./setup.sh
# 1. Starting PostgreSQL with CDC enabled
# 2. Creating database tables
# 3. Configuring logical replication
# 4. Verifying CDC prerequisites

# Or use convenient shortcuts
make start              # Interactive setup
make status             # Check what's running
make logs-connector     # Debug CDC connector
```

**Why use setup.sh:**

- 📚 **Educational** - Learn what CDC is and how it works as you set it up
- ✅ **Debuggable** - Clear status checks and error messages at each step
- 🔧 **Flexible** - Run all steps together or individual steps for troubleshooting
- 📊 **Transparent** - See exactly what's happening under the hood

**After running setup.sh**, start the remaining services and test the pipeline (see example-specific instructions below).

### TypeScript + TypeORM

```bash
cd apps/typeorm-example

# Set Redpanda license
export REDPANDA_LICENSE="your_license_key_here"

pnpm install
# Run interactive setup (accept the prompt to run pnpm setup-db)
./setup.sh

# Terminal 1: Start Moose (includes CDC connector)
moose dev

# Terminal 2: Start the API server
pnpm dev
```

Visit http://localhost:3000 for API and http://localhost:3000/reference for docs.

### Python + SQLModel

```bash
cd apps/sqlmodel-example

# Set Redpanda license
export REDPANDA_LICENSE="your_license_key_here"

# Setup (first time only)
python -m venv venv
source venv/bin/activate
pip install -e .

# Run interactive setup (accept the prompt to run python init_db.py)
./setup.sh

# Terminal 1: Start Moose (includes CDC connector)
moose dev

# Terminal 2: Start API (run python init_db.py first if you skipped it)
source venv/bin/activate
# python init_db.py
fastapi dev src/main.py --port 3002
```

Visit http://localhost:3002/docs for interactive API documentation.

**About SQLModel:** Created by FastAPI's author, SQLModel combines SQLAlchemy (database) and Pydantic (validation) into a single, type-safe model. One class definition serves as both database table and API validation schema.

### Test the Pipeline

```bash
cd apps/test-client
pnpm install && pnpm dev
```

Visit http://localhost:3001 to create data and watch CDC in action.

**The test client features:**

- 🔄 **Dynamic backend switching** - Switch between TypeORM, SQLModel, or other backends using the in-app Settings button
- 🎯 **Auto-detection** - Automatically shows settings modal if it can't connect to the backend
- 🎲 **Data generation** - Create random customers, products, and orders with one click
- 📊 **Real-time CDC** - Watch changes flow from PostgreSQL to ClickHouse in under 1 second
- ✏️ **Full CRUD** - Create, update, and delete records to test all CDC operations

See the [Test Client README](apps/test-client/README.md) for complete usage instructions.

## Documentation

### Getting Started

- [Quick Start Guide](docs/quickstart.md) - One-page onboarding for any ORM example
- [Docker Setup Guide](docs/docker-guide.md) - Ports, containers, and commands
- [TypeORM Example README](apps/typeorm-example/README.md) - TypeScript/Node.js implementation (recommended for beginners)
- [SQLModel Example README](apps/sqlmodel-example/README.md) - Python/FastAPI implementation
- [Drizzle Example README](apps/drizzle-example/README.md) - Experimental Drizzle ORM implementation
- [Prisma Example README](apps/prisma-example/README.md) - Experimental Prisma ORM implementation
- [Test Client README](apps/test-client/README.md) - Interactive React UI

### Architecture & Design

- [CDC Transformation Architecture (SQLModel)](apps/sqlmodel-example/docs/CDC_TRANSFORMATION_ARCHITECTURE.md)
- [OLTP → OLAP Model Translation (SQLModel)](apps/sqlmodel-example/docs/OLTP_TO_OLAP_MODEL_TRANSLATION.md)
- [Setup Script Walkthrough (SQLModel)](apps/sqlmodel-example/docs/SETUP_SCRIPT.md)

## Project Structure

```
oltp-to-olap-showcase/
├── apps/
│   ├── typeorm-example/       # ✅ TypeScript/Node.js (port 3000)
│   │   ├── src/               # TypeORM entities & Express API
│   │   ├── moose/             # Moose OLAP tables & transformations
│   │   ├── config/            # Moose configuration helpers
│   │   └── setup.sh           # Interactive CDC setup script
│   │
│   ├── sqlmodel-example/      # ✅ Python/FastAPI (port 3002)
│   │   ├── src/               # SQLModel models & FastAPI
│   │   ├── moose/             # Moose OLAP tables & transformations
│   │   ├── docs/              # Architecture & setup guides
│   │   └── setup.sh           # Interactive CDC setup script
│   │
│   ├── drizzle-example/       # ⚠️ Experimental (port 3003)
│   │   └── setup.sh           # Interactive CDC setup script
│   │
│   ├── prisma-example/        # ⚠️ Experimental (port 3004)
│   │   └── setup.sh           # Interactive CDC setup script
│   │
│   └── test-client/           # ✅ React UI (port 3001)
│       ├── src/
│       │   ├── components/    # Settings modal for backend switching
│       │   └── contexts/      # API context for dynamic URL management
│       ├── docs/              # Settings UI & environment configuration notes
│       └── README.md          # Test client documentation
│
├── packages/
│   └── shared/                # Shared middleware, types, and utilities
│
└── docs/                      # Centralized guides & troubleshooting
```

**All examples** include interactive `setup.sh` scripts that guide you through CDC configuration.

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

  @OneToMany(() => OrderItem, (item) => item.order)
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
  "after": { "id": 1, "customer_id": 123, "status": "pending", "total": 99.99 }
}
```

Redpanda Connect streams these events to Kafka topics in real-time.

### 3. Transform & Load

Moose functions transform normalized data into denormalized analytics tables:

```typescript
// Denormalize: join customer data into orders
export interface OrderFact {
  order_id: UInt64;
  customer_name: string; // From customers table
  customer_email: string; // From customers table
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
- Redpanda Connect (CDC connector for capturing WAL changes)
- Redpanda (Kafka-compatible streaming platform)
- Moose (stream processing and transformations)
- ClickHouse (columnar analytics database)

**ORM Examples:**

| Example   | Language   | ORM                                  | API Framework    | Port |
| --------- | ---------- | ------------------------------------ | ---------------- | ---- |
| TypeORM   | TypeScript | TypeORM 0.3                          | Express + Scalar | 3000 |
| SQLModel  | Python     | SQLModel (SQLAlchemy 2.0 + Pydantic) | FastAPI          | 3002 |
| Drizzle   | TypeScript | Drizzle                              | Express          | 3003 |
| Prisma    | TypeScript | Prisma                               | Express          | 3004 |

**Test Client:**

- React 18 + TypeScript + Vite
- shadcn/ui components (Dialog, Button, etc.)
- Tailwind CSS for styling
- React Query for data fetching
- Dynamic backend switching via settings UI

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

Contributions are welcome! This is an educational project demonstrating CDC patterns across multiple ORMs.

**Areas for contribution:**

- 🐛 **Bug fixes** - Improvements to existing TypeORM and SQLModel examples
- 📚 **Documentation** - Clarify setup instructions, add troubleshooting tips
- 🔧 **Experimental ORMs** - Help stabilize the Drizzle and Prisma examples
- ⚡ **Performance** - Optimize transformations and data flow
- 🧪 **Test scenarios** - Add new features to test client (filters, charts, etc.)
- 🎨 **UI improvements** - Enhance test client user experience

**Why contribute?**

- Learn CDC patterns hands-on
- See how different ORMs handle the same architecture
- Build portfolio-worthy work with real-world data engineering
- Help others learn from your improvements

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

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

## Ready to Get Started?

**Three ways to explore this project:**

1. **Quick Test** - Follow [Quick Start](#quick-start) above for a 5-minute setup
2. **Deep Dive** - Review the SQLModel architecture docs under `apps/sqlmodel-example/docs`
3. **Interactive Learning** - Run `./setup.sh` in any example directory for guided CDC configuration

**Choose your ORM:**

- [TypeORM](apps/typeorm-example/README.md) - TypeScript/Node.js (recommended for beginners)
- [SQLModel](apps/sqlmodel-example/README.md) - Python/FastAPI
- [Drizzle](apps/drizzle-example/README.md) and [Prisma](apps/prisma-example/README.md) - Experimental setups ready for contributions

**Then test with:** [Test Client](apps/test-client/README.md) - Interactive UI to see CDC in real-time
