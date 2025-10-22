# CDC Pipeline Design: OLTP → OLAP

## Architecture Overview

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  OLTP Database  │────▶│ CDC Capture  │────▶│ Transformation  │────▶│   ClickHouse    │
│  (PostgreSQL/   │     │  (Debezium)  │     │  Layer (Moose   │     │  (via Moose)    │
│   MySQL/SQLite) │     │              │     │   Flows)        │     │                 │
└─────────────────┘     └──────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                      │                       │
         │                      ▼                      │                       │
         │              ┌──────────────┐              │                       │
         │              │    Kafka     │◀─────────────┘                       │
         │              │   (Stream    │                                      │
         │              │   Buffer)    │                                      │
         │              └──────────────┘                                      │
         │                                                                    │
         └────────────────────────────────────────────────────────────────────┘
                              (Schema sync on migration)
```

## Components

### 1. CDC Capture Layer

**Technology:** Debezium (or alternatives)

**Purpose:** Capture all changes (INSERT, UPDATE, DELETE) from OLTP database

**Options:**

| Database   | CDC Tool                      | Notes                               |
| ---------- | ----------------------------- | ----------------------------------- |
| PostgreSQL | Debezium PostgreSQL Connector | Uses logical replication            |
| MySQL      | Debezium MySQL Connector      | Uses binlog                         |
| SQLite     | Custom Trigger-Based CDC      | No native CDC, use triggers + queue |

**Configuration:**

```json
{
  "name": "typeorm-oltp-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "localhost",
    "database.port": "5432",
    "database.user": "postgres",
    "database.password": "password",
    "database.dbname": "oltp_db",
    "database.server.name": "typeorm_oltp",
    "table.include.list": "public.customers,public.products,public.orders,public.order_items",
    "plugin.name": "pgoutput",
    "publication.autocreate.mode": "filtered",
    "transforms": "route",
    "transforms.route.type": "org.apache.kafka.connect.transforms.RegexRouter",
    "transforms.route.regex": "([^.]+)\\.([^.]+)\\.([^.]+)",
    "transforms.route.replacement": "oltp.$3"
  }
}
```

**Output:** Kafka topics with change events

- `oltp.customers`
- `oltp.products`
- `oltp.orders`
- `oltp.order_items`

### 2. Message Format (Debezium)

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
    "version": "2.5.0",
    "connector": "postgresql",
    "name": "typeorm_oltp",
    "ts_ms": 1704067200000,
    "db": "oltp_db",
    "schema": "public",
    "table": "customers",
    "txId": 12345,
    "lsn": 67890
  },
  "op": "c",
  "ts_ms": 1704067200100
}
```

**Operation Types:**

- `c` = CREATE (INSERT)
- `u` = UPDATE
- `d` = DELETE
- `r` = READ (initial snapshot)

### 3. Transformation Layer (Moose Flows)

**Purpose:** Transform OLTP events → OLAP format with denormalization

**Implementation:** Moose Flows (TypeScript-based stream processing)

#### Flow 1: Customer Dimension

```typescript
// moose-olap/flows/CustomerDimensionFlow.ts
import { Streamable } from '@514labs/moose-lib';

export interface OltpCustomerEvent {
  before: {
    id: number;
    email: string;
    name: string;
    country: string;
    city: string;
    created_at: string;
  } | null;
  after: {
    id: number;
    email: string;
    name: string;
    country: string;
    city: string;
    created_at: string;
  } | null;
  op: 'c' | 'u' | 'd' | 'r';
}

export interface CustomerDimensionRow {
  id: number;
  email: string;
  name: string;
  country: string;
  city: string;
  createdAt: Date;
}

export default {
  source: Streamable.ingest<OltpCustomerEvent>('oltp.customers'),
  transform: (event: OltpCustomerEvent): CustomerDimensionRow | null => {
    // Handle DELETE operations
    if (event.op === 'd' || !event.after) {
      return null; // ClickHouse ReplacingMergeTree will handle tombstones
    }

    // Transform to dimension format
    return {
      id: event.after.id,
      email: event.after.email,
      name: event.after.name,
      country: event.after.country,
      city: event.after.city,
      createdAt: new Date(event.after.created_at),
    };
  },
  destination: Streamable.table('CustomerDimension'),
};
```

#### Flow 2: Product Dimension

```typescript
// moose-olap/flows/ProductDimensionFlow.ts
import { Streamable } from '@514labs/moose-lib';

export interface OltpProductEvent {
  before: {
    id: number;
    name: string;
    category: string;
    price: number;
    created_at: string;
  } | null;
  after: {
    id: number;
    name: string;
    category: string;
    price: number;
    created_at: string;
  } | null;
  op: 'c' | 'u' | 'd' | 'r';
}

export interface ProductDimensionRow {
  id: number;
  name: string;
  category: string;
  price: number;
  createdAt: Date;
}

export default {
  source: Streamable.ingest<OltpProductEvent>('oltp.products'),
  transform: (event: OltpProductEvent): ProductDimensionRow | null => {
    if (event.op === 'd' || !event.after) {
      return null;
    }

    return {
      id: event.after.id,
      name: event.after.name,
      category: event.after.category,
      price: event.after.price,
      createdAt: new Date(event.after.created_at),
    };
  },
  destination: Streamable.table('ProductDimension'),
};
```

#### Flow 3: Order Fact (Denormalized)

```typescript
// moose-olap/flows/OrderFactFlow.ts
import { Streamable } from '@514labs/moose-lib';

export interface OltpOrderItemEvent {
  before: any;
  after: {
    id: number;
    order_id: number;
    product_id: number;
    quantity: number;
    price: number;
  } | null;
  op: 'c' | 'u' | 'd' | 'r';
}

export interface EnrichedOrderItem {
  id: number;
  orderId: number;
  productId: number;
  customerId: number;
  quantity: number;
  unitPrice: number;
  orderDate: Date;
  orderStatus: string;
  customerName: string;
  customerCountry: string;
  customerCity: string;
  productName: string;
  productCategory: string;
}

export interface OrderFactRow {
  id: number;
  customerId: number;
  productId: number;
  orderId: number;
  orderDate: Date;
  quantity: number;
  unitPrice: number;
  revenue: number;
  orderStatus: string;
  customerCountry: string;
  customerCity: string;
  productCategory: string;
  productName: string;
}

// Step 1: Enrich order items with related data
const enrichOrderItems = async (event: OltpOrderItemEvent): Promise<EnrichedOrderItem | null> => {
  if (event.op === 'd' || !event.after) {
    return null;
  }

  const orderItem = event.after;

  // Fetch related data (order, customer, product)
  // In production, use materialized views or cache
  const order = await fetchOrder(orderItem.order_id);
  const customer = await fetchCustomer(order.customer_id);
  const product = await fetchProduct(orderItem.product_id);

  return {
    id: orderItem.id,
    orderId: orderItem.order_id,
    productId: orderItem.product_id,
    customerId: order.customer_id,
    quantity: orderItem.quantity,
    unitPrice: orderItem.price,
    orderDate: new Date(order.order_date),
    orderStatus: order.status,
    customerName: customer.name,
    customerCountry: customer.country,
    customerCity: customer.city,
    productName: product.name,
    productCategory: product.category,
  };
};

export default {
  source: Streamable.ingest<OltpOrderItemEvent>('oltp.order_items'),
  transform: async (event: OltpOrderItemEvent): Promise<OrderFactRow | null> => {
    const enriched = await enrichOrderItems(event);

    if (!enriched) {
      return null;
    }

    // Pre-calculate measures
    return {
      id: enriched.id,
      customerId: enriched.customerId,
      productId: enriched.productId,
      orderId: enriched.orderId,
      orderDate: enriched.orderDate,
      quantity: enriched.quantity,
      unitPrice: enriched.unitPrice,
      revenue: enriched.quantity * enriched.unitPrice, // Pre-calculated
      orderStatus: enriched.orderStatus,
      customerCountry: enriched.customerCountry,
      customerCity: enriched.customerCity,
      productCategory: enriched.productCategory,
      productName: enriched.productName,
    };
  },
  destination: Streamable.table('OrderFact'),
};

// Helper functions (in production, use Redis cache or ClickHouse lookups)
async function fetchOrder(orderId: number) {
  // Query OLTP database or cache
  return {
    id: orderId,
    customer_id: 1,
    order_date: '2024-01-01T00:00:00Z',
    status: 'completed',
    total: 1999.99,
  };
}

async function fetchCustomer(customerId: number) {
  // Query OLTP database or cache
  return {
    id: customerId,
    name: 'John Doe',
    country: 'USA',
    city: 'San Francisco',
  };
}

async function fetchProduct(productId: number) {
  // Query OLTP database or cache
  return {
    id: productId,
    name: 'MacBook Pro',
    category: 'Electronics',
  };
}
```

### 4. Data Enrichment Strategy

**Problem:** Fact table needs denormalized data from multiple tables

**Solutions:**

#### Option A: Real-time Lookups (Simple, Higher Latency)

```typescript
// Query OLTP database for each event
const customer = await oltpDb.query('SELECT * FROM customers WHERE id = ?', [customerId]);
```

**Pros:** Simple, always fresh data  
**Cons:** High load on OLTP, slower processing

#### Option B: ClickHouse Lookups (Recommended)

```typescript
// Query ClickHouse dimensions (already in OLAP)
const customer = await clickhouse.query('SELECT country, city FROM dim_customer WHERE id = ?', [
  customerId,
]);
```

**Pros:** Fast, no OLTP load  
**Cons:** Dimensions must be loaded first (ordering dependency)

#### Option C: Redis Cache (Production)

```typescript
// Cache dimension data in Redis
const customer = await redis.hgetall(`customer:${customerId}`);
```

**Pros:** Very fast, reduced load  
**Cons:** Cache invalidation complexity, extra infrastructure

#### Option D: Kafka Streams Join (Advanced)

```typescript
// Join streams in Kafka Streams
const enrichedStream = orderItemsStream
  .join(ordersStream, (item, order) => ({ ...item, ...order }))
  .join(customersStream, (item, customer) => ({ ...item, customer }));
```

**Pros:** Stream-native, no external lookups  
**Cons:** Complex, requires KTables for dimensions

### 5. Handling Different Operations

```typescript
// Generic CDC handler
function handleCdcEvent<T>(event: CdcEvent<T>, transform: (data: T) => any): any | null {
  switch (event.op) {
    case 'c': // CREATE (INSERT)
    case 'r': // READ (initial snapshot)
      return transform(event.after!);

    case 'u': // UPDATE
      // For dimensions: ReplacingMergeTree handles updates automatically
      // For facts: Append new row (immutable fact pattern)
      return transform(event.after!);

    case 'd': // DELETE
      // For dimensions: Insert tombstone row (will be merged out)
      // For facts: Typically not deleted (immutable)
      return null;

    default:
      console.error('Unknown operation:', event.op);
      return null;
  }
}
```

### 6. Moose Configuration

```toml
# moose.config.toml
[project]
name = "typeorm-olap"
language = "typescript"

[clickhouse]
host = "localhost"
port = 9000
db_name = "olap_db"
username = "default"
password = ""

[streaming]
enabled = true

[kafka]
brokers = ["localhost:9092"]
group_id = "moose-olap-consumer"

[flows]
# Directory containing flow definitions
directory = "./moose-olap/flows"

[ingestion]
# Kafka topics to consume
topics = [
  "oltp.customers",
  "oltp.products",
  "oltp.orders",
  "oltp.order_items"
]
```

## Deployment Architecture

### Development Setup

```bash
# 1. Start infrastructure
docker-compose up -d postgres kafka zookeeper clickhouse

# 2. Deploy Debezium connector
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d @debezium-connector.json

# 3. Start Moose dev server
cd apps/typeorm-example
moose dev

# 4. Start OLTP API (generates data)
pnpm dev
```

### Production Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  # OLTP Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: oltp_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    command: postgres -c wal_level=logical
    ports:
      - '5432:5432'

  # Message Broker
  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    ports:
      - '9092:9092'

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  # CDC Connector
  debezium:
    image: debezium/connect:2.5
    depends_on:
      - kafka
      - postgres
    environment:
      BOOTSTRAP_SERVERS: kafka:9092
      GROUP_ID: 1
      CONFIG_STORAGE_TOPIC: connect_configs
      OFFSET_STORAGE_TOPIC: connect_offsets
      STATUS_STORAGE_TOPIC: connect_statuses
    ports:
      - '8083:8083'

  # OLAP Database
  clickhouse:
    image: clickhouse/clickhouse-server:latest
    ports:
      - '8123:8123'
      - '9000:9000'
    environment:
      CLICKHOUSE_DB: olap_db

  # Moose Stream Processor
  moose:
    build: .
    depends_on:
      - kafka
      - clickhouse
    environment:
      KAFKA_BROKERS: kafka:9092
      CLICKHOUSE_HOST: clickhouse
      CLICKHOUSE_PORT: 9000
    command: moose prod
```

## Data Flow Sequence

```
1. OLTP Change Occurs
   └─▶ INSERT INTO orders (customer_id, total) VALUES (1, 1999.99)

2. PostgreSQL WAL Capture
   └─▶ Logical replication slot captures change

3. Debezium Processes
   └─▶ Converts to CDC event, publishes to Kafka topic "oltp.orders"

4. Moose Flow Receives Event
   └─▶ OrderFlow.transform() called with CDC event

5. Enrichment Occurs
   └─▶ Lookup customer (id=1) from dim_customer in ClickHouse
   └─▶ Lookup product (id=1) from dim_product in ClickHouse

6. Transformation
   └─▶ Denormalize: Embed customer.country, product.category
   └─▶ Calculate: revenue = quantity * unitPrice

7. Write to ClickHouse
   └─▶ INSERT INTO fact_order (...) VALUES (...)
   └─▶ MergeTree table appends row

8. Query Available
   └─▶ SELECT * FROM fact_order WHERE customer_country = 'USA'
```

## Data Consistency Patterns

### Pattern 1: At-Least-Once Delivery

```typescript
// Kafka consumer with manual offset commit
consumer.on('message', async (message) => {
  try {
    await processMessage(message);
    await consumer.commitOffsets([message]); // Commit after processing
  } catch (error) {
    console.error('Processing failed, will retry:', error);
    // Message will be reprocessed
  }
});
```

### Pattern 2: Idempotent Writes

```typescript
// Use upsert pattern for dimensions
await clickhouse.insert('dim_customer', {
  id: customer.id, // Primary key
  email: customer.email,
  name: customer.name,
  // ... other fields
});
// ReplacingMergeTree will deduplicate by id
```

### Pattern 3: Event Ordering

```typescript
// Ensure order items processed after orders
const ordersProcessed = new Set<number>();

async function processOrderItem(event: OrderItemEvent) {
  // Wait for parent order to be processed
  while (!ordersProcessed.has(event.after.order_id)) {
    await sleep(100);
  }

  // Now safe to process
  await transformOrderItem(event);
}
```

## Monitoring & Observability

### Key Metrics

1. **CDC Lag:** Time between OLTP write and ClickHouse availability
2. **Throughput:** Events processed per second
3. **Error Rate:** Failed transformations / total events
4. **Data Quality:** Null checks, validation failures

### Monitoring Stack

```typescript
// moose-olap/monitoring/metrics.ts
import { Counter, Histogram } from 'prom-client';

export const cdcEventsProcessed = new Counter({
  name: 'cdc_events_processed_total',
  help: 'Total CDC events processed',
  labelNames: ['table', 'operation'],
});

export const transformationDuration = new Histogram({
  name: 'transformation_duration_seconds',
  help: 'Time to transform event',
  labelNames: ['flow'],
});

export const enrichmentErrors = new Counter({
  name: 'enrichment_errors_total',
  help: 'Failed enrichment lookups',
  labelNames: ['entity'],
});
```

## Error Handling & Recovery

### Dead Letter Queue

```typescript
// Failed events sent to DLQ for retry/investigation
async function processWithDLQ(event: CdcEvent) {
  try {
    await processEvent(event);
  } catch (error) {
    await kafka.send({
      topic: 'dlq.olap.errors',
      messages: [
        {
          key: event.source.table,
          value: JSON.stringify({
            event,
            error: error.message,
            timestamp: Date.now(),
          }),
        },
      ],
    });
  }
}
```

### Backfill Strategy

```bash
# Initial snapshot + ongoing CDC
# 1. Take snapshot of current OLTP state
debezium-connector.json: "snapshot.mode": "initial"

# 2. Load dimensions first (dependencies)
moose flow run CustomerDimensionFlow --backfill
moose flow run ProductDimensionFlow --backfill

# 3. Load facts (requires dimensions)
moose flow run OrderFactFlow --backfill

# 4. Switch to streaming mode
debezium-connector.json: "snapshot.mode": "never"
```

## Performance Optimization

### Batching

```typescript
// Batch writes to ClickHouse
const batch: OrderFactRow[] = [];
const BATCH_SIZE = 1000;

async function processBatch(event: CdcEvent) {
  const row = await transform(event);
  batch.push(row);

  if (batch.length >= BATCH_SIZE) {
    await clickhouse.insert('fact_order', batch);
    batch.length = 0;
  }
}
```

### Parallel Processing

```typescript
// Process multiple partitions concurrently
const consumers = Array(4)
  .fill(null)
  .map((_, i) => createConsumer(`consumer-${i}`, [`oltp.order_items.${i}`]));

await Promise.all(consumers.map((c) => c.start()));
```

## Cost Considerations

| Component     | Cost Factor                | Optimization                   |
| ------------- | -------------------------- | ------------------------------ |
| Kafka         | Storage (retention period) | Set retention to 7 days        |
| ClickHouse    | Storage (fact table size)  | Partition pruning, compression |
| CDC Connector | Compute (event processing) | Right-size based on throughput |
| Network       | Cross-region data transfer | Co-locate services             |

## Summary

This CDC pipeline:

✅ **Captures** all OLTP changes in real-time (Debezium)  
✅ **Buffers** events reliably (Kafka)  
✅ **Transforms** OLTP → OLAP with denormalization (Moose Flows)  
✅ **Loads** into ClickHouse optimized for analytics  
✅ **Maintains** type safety and consistency  
✅ **Scales** with partitioning and batching  
✅ **Monitors** with metrics and DLQ

The result: Near real-time analytics on ClickHouse while keeping your OLTP database fast! 🚀
