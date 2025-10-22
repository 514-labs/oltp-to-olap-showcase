# Redpanda Connect CDC Setup

This project uses **[Redpanda Connect](https://docs.redpanda.com/redpanda-connect/)** for PostgreSQL Change Data Capture (CDC).

## Configuration Overview

Based on the [Redpanda Connect Quickstart](https://docs.redpanda.com/redpanda-connect/get-started/quickstarts/rpk/) and [postgres_cdc input documentation](https://docs.redpanda.com/redpanda-connect/components/inputs/postgres_cdc/).

### Architecture

```
PostgreSQL (WAL) → Redpanda Connect (postgres_cdc) → Redpanda Kafka → Moose Streaming Functions → ClickHouse
```

### Docker Image

We use the official Redpanda Connect image:

```yaml
image: docker.redpanda.com/redpandadata/connect:latest
```

### Command

Following the [documentation](https://docs.redpanda.com/redpanda-connect/get-started/quickstarts/rpk/), we run:

```bash
run /connect.yaml
```

This is equivalent to `rpk connect run /connect.yaml` but the Docker image has `rpk connect` as the entrypoint.

## Configuration File (`redpanda-connect.yaml`)

### Input: PostgreSQL CDC

```yaml
input:
  postgres_cdc:
    dsn: 'postgres://postgres:postgres@typeorm-oltp-postgres:5432/typeorm_db?sslmode=disable'
    slot_name: 'redpanda_cdc_slot'
    publication_name: 'redpanda_cdc_publication'
    snapshot_mode: 'initial'
    tables:
      - 'public.customers'
      - 'public.products'
      - 'public.orders'
      - 'public.order_items'
```

**Key points:**

- Uses PostgreSQL logical replication (WAL)
- Requires `wal_level=logical` in PostgreSQL config
- Creates a replication slot for CDC
- Takes initial snapshot, then streams changes

### Pipeline: Message Processing

```yaml
pipeline:
  processors:
    - mapping: |
        # Store original CDC envelope
        root = this

        # Add metadata for routing
        meta table_name = this.source.table
        meta operation = this.op
        meta timestamp = this.ts_ms
```

**Key points:**

- Uses Bloblang mapping language (Redpanda Connect's native DSL)
- Preserves full CDC envelope (before, after, source, op)
- Extracts metadata for downstream routing

### Output: Kafka (Redpanda)

```yaml
output:
  kafka:
    addresses:
      - 'redpanda:19092'
    topic: 'typeorm.public.${! meta("table_name") }'
    key: '${! json("after.id").or(json("before.id")) }'
    max_in_flight: 1
    compression: 'snappy'
```

**Key points:**

- Routes to Moose-managed Redpanda instance
- Dynamic topic routing based on table name
- Uses record ID as message key for ordering
- Single in-flight message ensures ordering

### HTTP API

```yaml
http:
  enabled: true
  address: '0.0.0.0:4195'
  debug_endpoints: true
```

**Available endpoints:**

- `GET /ready` - Health check
- `GET /metrics` - Prometheus metrics
- `GET /stats` - Runtime statistics

## PostgreSQL Setup

The `setup-cdc.sh` script creates:

### 1. Publication

```sql
CREATE PUBLICATION redpanda_cdc_publication FOR TABLE
    public.customers,
    public.products,
    public.orders,
    public.order_items;
```

### 2. Replication Slot

```sql
SELECT pg_create_logical_replication_slot('redpanda_cdc_slot', 'pgoutput');
```

## Monitoring

### Health Check

```bash
curl http://localhost:4195/ready
```

### Metrics (Prometheus format)

```bash
curl http://localhost:4195/metrics
```

### Runtime Statistics

```bash
curl http://localhost:4195/stats
```

### Logs

```bash
docker logs typeorm-redpanda-connect -f
```

## Message Format

Redpanda Connect preserves the full PostgreSQL CDC envelope:

```json
{
  "before": null,
  "after": {
    "id": 1,
    "email": "john@example.com",
    "name": "John Doe",
    "country": "USA",
    "city": "San Francisco",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "source": {
    "version": "1.0.0",
    "connector": "postgresql",
    "name": "typeorm",
    "ts_ms": 1704067200000,
    "db": "typeorm_db",
    "schema": "public",
    "table": "customers",
    "txId": 12345,
    "lsn": 67890
  },
  "op": "c",
  "ts_ms": 1704067200100
}
```

**Operation types:**

- `c` = CREATE (INSERT)
- `u` = UPDATE
- `d` = DELETE
- `r` = READ (initial snapshot)

## Kafka Topics

Messages are routed to:

- `typeorm.public.customers`
- `typeorm.public.products`
- `typeorm.public.orders`
- `typeorm.public.order_items`

## Moose Integration

Moose Flows consume these topics and transform to OLAP format:

- `moose-olap/flows/CustomerDimensionFlow.ts`
- `moose-olap/flows/ProductDimensionFlow.ts`
- `moose-olap/flows/OrderFactFlow.ts`

## Troubleshooting

### Check if Redpanda Connect is running

```bash
docker ps | grep redpanda-connect
curl http://localhost:4195/ready
```

### View logs

```bash
docker logs typeorm-redpanda-connect -f
```

### Verify PostgreSQL replication

```bash
docker exec typeorm-oltp-postgres psql -U postgres -d typeorm_db \
  -c "SELECT * FROM pg_replication_slots;"
```

### Test Redpanda connection

```bash
docker exec redpanda rpk topic list
docker exec redpanda rpk topic consume typeorm.public.customers --num 5
```

### Restart Redpanda Connect

```bash
docker restart typeorm-redpanda-connect
```

## Key Differences from Debezium

| Feature            | Redpanda Connect    | Debezium               |
| ------------------ | ------------------- | ---------------------- |
| **Configuration**  | YAML file           | JSON REST API          |
| **Setup**          | File-based          | API registration       |
| **Command**        | `run config.yaml`   | Kafka Connect cluster  |
| **Image**          | `connect:latest`    | `debezium/connect:2.5` |
| **Health Check**   | `GET /ready`        | `GET /`                |
| **Metrics**        | Built-in Prometheus | Requires JMX exporter  |
| **Latency**        | ~100-200ms          | ~200-300ms             |
| **Resource Usage** | Lower               | Higher                 |

## References

- **[Redpanda Connect Documentation](https://docs.redpanda.com/redpanda-connect/)** - Main docs
- **[Quickstart Guide](https://docs.redpanda.com/redpanda-connect/get-started/quickstarts/rpk/)** - Getting started
- **[postgres_cdc Input](https://docs.redpanda.com/redpanda-connect/components/inputs/postgres_cdc/)** - CDC connector
- **[Kafka Output](https://docs.redpanda.com/redpanda-connect/components/outputs/kafka/)** - Kafka producer
- **[Bloblang Guide](https://docs.redpanda.com/redpanda-connect/guides/bloblang/about/)** - Mapping language

## Enterprise Features

This setup uses the enterprise `postgres_cdc` input connector. Ensure you have:

- A valid [Redpanda Enterprise license](https://www.redpanda.com/enterprise)
- Or a [30-day trial license](http://redpanda.com/try-enterprise)

The free tier of Redpanda does not include the `postgres_cdc` connector.
