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

## Shared Configuration Template

The connector configuration now lives in `packages/shared/cdc/redpanda-connect.template.yaml` so every ORM demo can reuse the same Bloblang pipeline. Each instance customises behaviour through environment variables exposed in its `docker-compose.dev.override.yaml`.

```yaml
input:
  postgres_cdc:
    dsn: ${POSTGRES_CDC_DSN}
    schema: ${POSTGRES_CDC_SCHEMA:public}
    slot_name: ${POSTGRES_CDC_SLOT:redpanda_cdc_slot}
    publication_name: ${POSTGRES_CDC_PUBLICATION:redpanda_cdc_publication}
    tables: ${POSTGRES_CDC_TABLES_JSON:["customers","products","orders","order_items"]}

pipeline:
  processors:
    - mapping: |
        root = this
        root._metadata = {
          "table": meta("table"),
          "operation": meta("operation"),
          "lsn": meta("lsn")
        }
        root.payload = this

output:
  kafka:
    addresses:
      - ${POSTGRES_CDC_BROKER_ADDRESS:redpanda:9092}
    topic: ${POSTGRES_CDC_TOPIC:cdc_events}
    max_in_flight: 1

http:
  address: ${POSTGRES_CDC_HTTP_ADDR:0.0.0.0:4195}
```

**Key points:**

- `POSTGRES_CDC_DSN`, `POSTGRES_CDC_TABLES_JSON`, and `POSTGRES_CDC_TOPIC` are the only per-app overrides needed.
- Metadata from Redpanda Connect is copied into the payload so Moose streaming functions can access it without Bloblang helpers.
- The HTTP server defaults to `0.0.0.0:4195`, but ports can be remapped via `POSTGRES_CDC_HTTP_PORT` in docker compose.

## PostgreSQL Setup

The shared script `packages/shared/cdc/init-postgres-cdc.sh` creates:

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
