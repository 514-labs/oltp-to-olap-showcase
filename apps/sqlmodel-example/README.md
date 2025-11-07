# SQLModel CDC Example

This project walks through an end-to-end CDC pipeline that moves SQLModel-backed PostgreSQL changes into ClickHouse using Redpanda and MooseStack. It highlights dynamic stream routing, shared SQLModel/Pydantic models, and a practical pattern for delete events that arrive without full row data.

## What You'll See

- Runtime stream lookup that routes CDC events without hard-coded table maps
- A base-model pattern that normalizes sparse `delete` events
- Type-aware defaults that backfill missing values before data lands in ClickHouse
- ReplacingMergeTree tables that dedupe by LSN and mark soft deletes
- FastAPI endpoints writing into PostgreSQL, with results mirrored into ClickHouse
- Single SQLModel definitions reused for both ORM and OLAP validation

## Architecture

```
PostgreSQL (OLTP)           Redpanda               Moose Streams       ClickHouse (OLAP)
┌─────────────────┐         ┌─────────┐            ┌──────────┐       ┌──────────────┐
│ SQLModel Tables │ ──WAL─> │ Connect │ ──Kafka──> │ Transform│ ───>  │ ReplacingMT  │
│ Normalized      │         │ (CDC)   │            │ Dynamic  │       │ Denormalized │
│ Relations       │         └─────────┘            │ Routing  │       │ Star Schema  │
└─────────────────┘                                └──────────┘       └──────────────┘
     customer                sqlmodel_cdc_events      get_stream()       customer_dim
     product                                          + Field            product_dim
     order                                            defaults           order_fact
     orderitem                                                           orderitem_fact
```

**Data flow:**

1. SQLModel insert/update/delete → PostgreSQL transaction log (WAL)
2. Redpanda Connect captures changes → streams to Kafka topic
3. Moose Streaming Functions extract table name → looks up corresponding stream from registry at runtime
4. Pydantic model validates payload → base class fills missing fields with type defaults
5. ClickHouse ReplacingMergeTree → deduplicates by LSN, tracks deletes with flag

**Implementation map:**

- `src/db/` &rarr; OLTP SQLModel entities and SQLAlchemy ORM bindings
- `moose/transformations/` &rarr; Moose streaming functions that look up the correct stream at runtime
- `moose/models/` &rarr; Pydantic/SQLModel OLAP models, all inheriting from `CdcOlapModelBase`
- `moose/sinks/` &rarr; Stream and table definitions that materialize data inside ClickHouse
- `src/main.py` &rarr; FastAPI app that exercises the write path

## The Delete Event Challenge

PostgreSQL logical replication emits full rows for `insert` and `update`, but `delete` events only include the primary key; every other field arrives as `None`. In ClickHouse we aim to keep columns non-nullable and use `LowCardinality` where possible for optimal compression and read performance. Accepting the raw delete payload would force `Nullable` columns and negate those optimizations.

**Solution in this example**

```python
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Any, Union, get_args, get_origin
from pydantic import model_validator

class CdcOlapModelBase(CdcFields):
    @model_validator(mode='before')
    @classmethod
    def replace_none_with_type_defaults(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        type_defaults = {
            str: '',
            int: 0,
            float: 0.0,
            bool: False,
            datetime: datetime.fromtimestamp(0),
            Decimal: Decimal('0'),
        }

        for field_name, field_info in cls.model_fields.items():
            if field_name not in data or data[field_name] is not None:
                continue

            python_type = field_info.annotation

            origin = get_origin(python_type)
            if origin is Union:
                args = [arg for arg in get_args(python_type) if arg is not type(None)]
                if args:
                    python_type = args[0]

            origin = get_origin(python_type)
            if origin is Annotated:
                python_type = get_args(python_type)[0]

            if python_type in type_defaults:
                data[field_name] = type_defaults[python_type]

        return data

class Customer(CustomerBase, CdcOlapModelBase):
    id: Annotated[int, "uint64"]
```

1. `CdcOlapModelBase` inspects the declared field types and replaces `None` values before validation runs.
2. Fields stay non-nullable in ClickHouse because each delete event inherits deterministic defaults instead of `NULL`.
3. The `is_deleted` flag (fed by the CDC metadata) marks soft deletes while the rest of the row carries fallback values for analytics.

Trade-off: the base class must understand how to unwrap `Optional` and `Annotated` types, but individual OLAP models no longer duplicate default logic.

See [docs/OLTP_TO_OLAP_MODEL_TRANSLATION.md](docs/OLTP_TO_OLAP_MODEL_TRANSLATION.md) for implementation details. For a walkthrough of the setup automation, read [docs/SETUP_SCRIPT.md](docs/SETUP_SCRIPT.md).

## Quick Start

### Prerequisites

- Python 3.10+
- Docker and Docker Compose
- Redpanda Enterprise License - [Get free 30-day trial](https://redpanda.com/try-enterprise)

### Installation

```bash
cd apps/sqlmodel-example

python -m venv venv
source venv/bin/activate

pip install -e .
```

### Configure Environment

```bash
cp .env.example .env
```

- Set `REDPANDA_LICENSE` to your Redpanda Enterprise trial or production key. This is the only required change for the demo pipeline.
- The remaining entries already match the sample stack; adjust them only if you are pointing at different infrastructure (see “Optional CDC Configuration” below).

#### Optional CDC Configuration

The supplied configuration is ready for the local demo. Tweak it only if your environment differs:

- `.env` — adjust `POSTGRES_CDC_*`, topic, or broker settings to point at your own PostgreSQL/Redpanda infrastructure. `./setup.sh` reads these values when it creates publications and replication slots.
- `redpanda-connect.yaml` — update the `tables` list (and matching entries in `.env`) when you add or rename SQLModel entities so the connector emits events for them.
- `docker-compose.dev.override.yaml` — override DSNs or log levels if PostgreSQL/Redpanda live outside Docker.
- `setup.sh` — rerun `./setup.sh setup-cdc` after any schema changes so the publication picks up new tables before restarting `moose dev`.

### Running the Pipeline

**Set Redpanda License:**

```bash
export REDPANDA_LICENSE="your_license_key_here"
```

**Terminal 1: PostgreSQL + CDC Connector**

```bash
./setup.sh
# Starts PostgreSQL with logical replication enabled
# Waits for tables (run python init_db.py when prompted)
# Configures CDC publication & replication slot
```

**Terminal 2: Moose**

```bash
moose dev
# Wait for: "⏳ Waiting for tables to be created..."
```

**Terminal 3: FastAPI Server**

```bash
source venv/bin/activate
# If you skipped the setup prompt, create tables now (safe to rerun)
# python init_db.py

fastapi dev src/main.py --port 3002
```

**Verify:**

```bash
curl http://localhost:3002/health
# Should return: {"status": "healthy"}
```

## What to Verify

### 1. Create Test Data

```bash
curl -X POST http://localhost:3002/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "name": "Jane Doe",
    "country": "USA",
    "city": "San Francisco"
  }'

curl -X POST http://localhost:3002/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Mouse",
    "category": "Electronics",
    "price": "29.99"
  }'
```

### 2. Check PostgreSQL (OLTP)

```bash
docker exec -it sqlmodel-postgres psql -U postgres -d sqlmodel_db

SELECT * FROM customer LIMIT 5;
SELECT * FROM "order" LIMIT 5;
\q
```

### 3. Check ClickHouse (OLAP)

```bash
docker exec -it moose-clickhouse clickhouse-client -u panda --password pandapass

# Data should appear within 1-2 seconds
SELECT * FROM local.customer_dim LIMIT 5;
SELECT * FROM local.product_dim LIMIT 5;

# Check CDC metadata
SELECT order_id, customer_name, total, is_deleted, lsn
FROM local.order_fact
ORDER BY lsn DESC
LIMIT 10;

exit
```

**Look for:**

- Data appears in ClickHouse within 1-2 seconds of PostgreSQL insert
- `is_deleted = 0` for active records
- `lsn` increases with each change (used for deduplication)
- Delete operations set `is_deleted = 1` with empty string defaults for missing fields

## Testing with Frontend

Optional: Use the React test client to generate test data interactively.

```bash
cd apps/test-client
pnpm install
pnpm dev

# Visit http://localhost:3001
```

Features:

- Switch between TypeORM and SQLModel backends
- Generate random customers and products
- Create orders with multiple items
- Update order status
- Delete orders and observe soft-delete behavior in ClickHouse

## Documentation

**Implementation details:**

- [CDC_TRANSFORMATION_ARCHITECTURE.md](docs/CDC_TRANSFORMATION_ARCHITECTURE.md) - Dynamic routing, DLQ, scaling
- [OLTP_TO_OLAP_MODEL_TRANSLATION.md](docs/OLTP_TO_OLAP_MODEL_TRANSLATION.md) - Type introspection, field defaults, delete event handling
- [SETUP_SCRIPT.md](docs/SETUP_SCRIPT.md) - How `./setup.sh` orchestrates Postgres + CDC

**Setup guides:**

- [../../README.md](../../README.md) - Project overview
- [Troubleshooting](../../TROUBLESHOOTING.md) - Common CDC issues and fixes
- [Test Client README](../test-client/README.md) - Generate data and observe CDC

## Project Structure

```
sqlmodel-example/
├── src/
│   ├── db/
│   │   ├── base.py          # Session + engine helpers
│   │   └── models.py        # SQLModel OLTP entities & DTOs
│   └── main.py              # FastAPI application & routes
│
├── moose/
│   ├── models/models.py     # OLAP models (Pydantic + CdcOlapModelBase)
│   ├── transformations/process_cdc_events.py  # Dynamic routing transformation
│   ├── sinks/
│   │   ├── streams.py       # Stream definitions
│   │   └── tables.py        # ClickHouse table configs
│   ├── apis/                # Moose HTTP endpoints (optional)
│   └── main.py              # Wire sources, transforms, and sinks
│
├── init_db.py               # Database initialization
├── setup.sh                 # Interactive setup script
├── docker-compose.oltp.yaml # PostgreSQL service
├── redpanda-connect.yaml    # CDC connector config
├── moose.config.toml        # Moose configuration
├── requirements.txt         # Python dependencies
└── README.md                # This file
```

## Technology Stack

- Python 3.10+
- SQLModel (combines SQLAlchemy 2.0 + Pydantic v2)
- FastAPI + Uvicorn
- PostgreSQL 15 with logical replication
- Redpanda Connect (Enterprise) for CDC
- Redpanda for streaming (Kafka-compatible)
- Moose + ClickHouse for OLAP

## API Endpoints

All endpoints return camelCase JSON.

**Customers:**

- `POST /api/customers` - Create customer
- `GET /api/customers` - List all customers
- `GET /api/customers/{id}` - Get customer by ID

**Products:**

- `POST /api/products` - Create product
- `GET /api/products` - List all products
- `GET /api/products/{id}` - Get product by ID

**Orders:**

- `POST /api/orders` - Create order
- `GET /api/orders` - List all orders
- `GET /api/orders/{id}` - Get order by ID
- `PATCH /api/orders/{id}` - Update order status
- `DELETE /api/orders/{id}` - Delete order (soft delete in ClickHouse)

**Order Items:**

- `POST /api/order-items` - Create order item
- `GET /api/order-items` - List all order items

**Documentation:**

- Swagger UI: http://localhost:3002/docs
- ReDoc: http://localhost:3002/redoc

## Troubleshooting

### CDC Events Not Flowing

**Check Moose is running:**

```bash
# Terminal with "moose dev" should show:
# "Streaming Functions Deployed Successfully"
```

**Check CDC connector:**

```bash
make logs-connector

# Should show: "Connected to PostgreSQL" and "Publishing to Kafka topic"
```

**Check table names match:**

```bash
# Stream names in moose/sinks/streams.py must match CDC table names exactly (case-sensitive)
# CDC table: "customer" → Stream name: "customer"
```

**Check data exists:**

```bash
docker exec -it sqlmodel-postgres psql -U postgres -d sqlmodel_db -c "SELECT COUNT(*) FROM customer;"
```

### Delete Events Showing Empty Strings

Expected behavior. Delete events only contain the primary key. Other fields use defaults (empty strings, 0, etc.). The `is_deleted = 1` flag indicates the row is deleted. See [docs/OLTP_TO_OLAP_MODEL_TRANSLATION.md](docs/OLTP_TO_OLAP_MODEL_TRANSLATION.md).

## Adding a New Table

To add a new table to CDC tracking:

**1. Define OLAP Model:** `moose/models/models.py`

```python
class Payment(PaymentBase, CdcOlapModelBase):
    id: Annotated[int, "uint64"]
    amount: float = Field(default=0.0)
    status: Annotated[str, "LowCardinality"] = Field(default='')
```

**2. Create Stream:** `moose/sinks/streams.py`

```python
PaymentStream = Stream[Payment](name="payment")  # Must match CDC table name
```

**3. Create OLAP Table:** `moose/sinks/tables.py`

```python
PaymentTable = OlapTable[Payment](
    name="payment",
    config=OlapConfig(
        order_by_fields=["id"],
        engine=ReplacingMergeTreeEngine(ver="lsn", is_deleted="is_deleted"),
    ),
)
```

**4. Wire Stream to Table:** `moose/main.py`

```python
PaymentStream.config.destination = PaymentTable
```

The transformation in `process_cdc_events.py` requires no changes due to dynamic routing.

## Environment Variables

| Variable           | Default                                                     | Description                                                    |
| ------------------ | ----------------------------------------------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`     | `postgresql://postgres:postgres@localhost:5433/sqlmodel_db` | PostgreSQL connection (replace port if you override `DB_PORT`) |
| `AUTO_INIT_DB`     | `false`                                                     | Auto-create tables on startup                                  |
| `REDPANDA_LICENSE` | Required                                                    | Redpanda Enterprise license key                                |

## Additional Resources

- [SQLModel Documentation](https://sqlmodel.tiangolo.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Moose Documentation](https://docs.fiveonefour.com/moose/)
- [PostgreSQL Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)
- [Redpanda Connect](https://docs.redpanda.com/redpanda-connect/)
- [TypeORM Example](../typeorm-example/README.md) - TypeScript/Node.js implementation
- [Main Project README](../../README.md) - Repository overview & quick start
