# Test Client - Interactive CDC Pipeline Tester

A hands-on React application for exploring the OLTP-to-OLAP CDC pipeline in action. Create customers, products, and orders, then watch in real-time as changes flow from PostgreSQL through Redpanda to ClickHouse.

## What This Is

This test client provides an interactive UI for the [oltp-to-olap-showcase](../../README.md) project. Instead of manually crafting API requests, you can:

- Generate realistic test data with a single click
- Create orders with random items and customers
- Modify existing orders and see CDC updates flow through
- Delete records and verify soft-delete handling
- Observe the complete data pipeline in action

Think of it as a sandbox for understanding how Change Data Capture works—from user action to analytics-ready data.

## Why It Exists

When learning about CDC pipelines, the biggest challenge is visualization. How do changes actually flow? What happens when you update a record? How fast is "real-time"?

This test client answers those questions by making the abstract concrete. Click a button, watch data flow through multiple systems, query ClickHouse to verify arrival—all within seconds.

## Architecture Context

The test client fits into the larger OLTP-to-OLAP architecture:

```
Test Client (React)
       ↓
Express/FastAPI (OLTP API)
       ↓
PostgreSQL (Transactions)
       ↓ WAL
Redpanda Connect (CDC)
       ↓
Redpanda (Kafka)
       ↓
Moose (Stream Processing)
       ↓
ClickHouse (Analytics)
```

Every button click in this UI triggers a cascade through this entire pipeline. You can verify the results by querying ClickHouse directly.

## Prerequisites

Before starting the test client, ensure the OLTP system is running:

### For TypeORM Example (Port 3000)

```bash
cd /Users/oliviakane/oltp-to-olap-showcase/apps/typeorm-example

# Terminal 1: Start PostgreSQL with CDC enabled
pnpm start-oltp

# Terminal 2: Start Moose (ClickHouse, Redpanda, transformations)
moose dev

# Terminal 3: Start the API server
pnpm dev
```

Verify the API is accessible at http://localhost:3000

### For SQLAlchemy Example (Port 3002)

```bash
cd /Users/oliviakane/oltp-to-olap-showcase/apps/sqlalchemy-example

# Terminal 1: Start PostgreSQL
./start-oltp.sh

# Terminal 2: Start Moose
moose dev

# Terminal 3: Start FastAPI
python -m uvicorn src.main:app --reload --port 3002
```

Verify the API is accessible at http://localhost:3002

## Installation and Setup

```bash
cd /Users/oliviakane/oltp-to-olap-showcase/apps/test-client

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

The test client will start at http://localhost:3001

## Using the Test Client

### 1. Generate Seed Data

Before creating orders, you need customers and products in the system.

**Generate Customers:**
Click "Generate Random Customer" to create test customers with realistic names, emails, countries, and cities. Generate 5-10 customers to start.

**Generate Products:**
Click "Generate Random Product" to create test products with names, categories, and prices. Generate 10-15 products for variety.

**What's Happening:**
Each button click sends a POST request to your OLTP API. PostgreSQL writes the record and logs it to the WAL. Within milliseconds, Redpanda Connect captures the change and publishes it as a CDC event.

### 2. Create Orders

Once you have customers and products, click "Generate Random Order" to create test orders.

**What Gets Created:**
- A new order associated with a random customer
- 1-5 order items, each with a random product and quantity
- Calculated totals based on product prices

**Watch the Pipeline:**
This single button triggers multiple database inserts:
1. One INSERT into the `orders` table
2. Multiple INSERTs into the `order_items` table
3. CDC events for each insert
4. Stream processing in Moose to denormalize the data
5. INSERTs into ClickHouse dimension and fact tables

All of this happens in under a second.

### 3. Edit Orders

Click the edit (pencil) icon on any order to modify:
- Customer assignment
- Order status (pending, confirmed, shipped, delivered, cancelled)
- Total amount

**What This Tests:**
- UPDATE operations in the CDC pipeline
- How Moose handles change events vs. initial inserts
- ClickHouse's ReplacingMergeTree engine for deduplication

### 4. Delete Orders

Click the delete (trash) icon to remove an order.

**What This Tests:**
- DELETE operations in CDC
- Soft-delete patterns (the `is_deleted` flag)
- How analytics tables handle removed records
- Whether aggregations correctly exclude deleted data

## Verifying the Pipeline

The real learning happens when you verify that changes reached ClickHouse.

### Check Dimension Tables

```bash
# Connect to ClickHouse
docker exec -it clickhouse-container clickhouse-client

# Query customer dimension
SELECT * FROM local.dim_customer LIMIT 10;

# Query product dimension
SELECT * FROM local.dim_product LIMIT 10;

# Query order dimension
SELECT * FROM local.dim_order LIMIT 10;
```

You should see the same data you created through the test client, with added CDC fields like `is_deleted` and `lsn` (log sequence number).

### Check Fact Tables

```bash
# Query order items fact table
SELECT * FROM local.fact_order_item LIMIT 10;

# Check the denormalized joined view
SELECT
  orderId,
  customerCountry,
  productCategory,
  quantity,
  revenue
FROM local.joined_orders
LIMIT 10;
```

Notice how `joined_orders` includes customer and product details without requiring JOINs—this is the power of denormalization for analytics.

### Check Aggregations

```bash
# Revenue by country
SELECT
  customerCountry,
  COUNT(DISTINCT orderId) as order_count,
  SUM(revenue) as total_revenue
FROM local.joined_orders
WHERE is_deleted = 0
GROUP BY customerCountry
ORDER BY total_revenue DESC;

# Revenue by product category
SELECT
  productCategory,
  SUM(revenue) as total_revenue,
  SUM(quantity) as units_sold
FROM local.joined_orders
WHERE is_deleted = 0
GROUP BY productCategory
ORDER BY total_revenue DESC;
```

These queries run in milliseconds because the data is already denormalized and stored in a columnar format optimized for aggregations.

## Understanding the Data Flow

### Latency Expectations

From the moment you click a button to when data appears in ClickHouse:

- **PostgreSQL write**: <10ms
- **CDC capture**: 50-100ms
- **Redpanda publish**: <50ms
- **Moose transformation**: 10-50ms
- **ClickHouse insert**: 50-100ms

**Total end-to-end latency**: 200-300ms typically, under 1 second worst case.

This is what "real-time analytics" means—not instantaneous, but fast enough that dashboards can show what's happening now, not what happened last night.

### CDC Event Structure

When you create an order, PostgreSQL logs a WAL entry that looks like:

```json
{
  "table": "orders",
  "operation": "insert",
  "before": null,
  "after": {
    "id": 123,
    "customer_id": 45,
    "status": "pending",
    "total": 299.99,
    "created_at": "2025-10-22T10:30:00Z"
  },
  "_metadata": {
    "lsn": "0/1A2B3C4D",
    "timestamp": "2025-10-22T10:30:00.123Z"
  }
}
```

Moose receives this event, transforms it (adding customer details via dictionary lookup), and writes it to ClickHouse.

### Transformation Logic

Moose transformations are just TypeScript functions:

```typescript
export default async function processOrder(event: OrderCDCEvent) {
  return {
    order_id: event.after.id,
    customer_id: event.after.customer_id,
    status: event.after.status,
    total: event.after.total,
    order_date: new Date(event.after.created_at),
    is_deleted: event.operation === 'delete' ? 1 : 0,
    lsn: parseInt(event._metadata.lsn, 16)
  };
}
```

This is the bridge between your transactional data model and your analytics schema.

## Troubleshooting

### "Cannot connect to API"

**Symptom**: Buttons don't work, console shows network errors.

**Solution**:
- Verify the OLTP API is running (check http://localhost:3000 or http://localhost:3002)
- Check that PostgreSQL is running: `docker ps | grep postgres`
- Review API logs for errors

### "Data appears in PostgreSQL but not ClickHouse"

**Symptom**: API requests succeed, but ClickHouse queries return no data.

**Solution**:
- Check Moose is running: look for the Moose dev server output
- Verify CDC connector is active: check Redpanda Connect logs
- Check for transformation errors in Moose console
- Verify ClickHouse is running: `docker ps | grep clickhouse`

### "Orders created but can't see items"

**Symptom**: Orders appear in the list but show 0 items.

**Solution**:
- Ensure products exist before creating orders
- Check that order items table has data: query PostgreSQL directly
- Verify the order items CDC stream is flowing

### Slow data propagation

**Symptom**: Several seconds delay between creation and ClickHouse availability.

**Solution**:
- Check system resources—Docker containers may be resource-constrained
- Review Moose transformation performance
- Verify network latency between containers
- Check ClickHouse is not under heavy load

## Next Steps

### Coming from the Blog Post?

If you're here after reading [Just OLAP It: When Your App Outgrows Its Database](../../BLOG_POST.md), this test client lets you experience the concepts firsthand:

- **Real-time CDC**: Create data and watch it flow
- **Denormalization**: Query `joined_orders` and see no JOINs required
- **Stream processing**: Observe TypeScript transformations in action
- **OLAP performance**: Run aggregation queries that would crush PostgreSQL

### Want to Dive Deeper?

Explore the full architecture and documentation:

- **[Main README](../../README.md)** - Project overview and quickstart
- **[TypeORM Example](../typeorm-example/README.md)** - TypeScript/Node.js implementation
- **[SQLAlchemy Example](../sqlalchemy-example/README.md)** - Python/FastAPI implementation
- **[OLAP Conversion Guide](../typeorm-example/docs/OLAP_CONVERSION_GUIDE.md)** - How to convert your ORM models
- **[CDC Pipeline Design](../typeorm-example/docs/CDC_PIPELINE_DESIGN.md)** - Architecture deep dive

### Extend the Test Client

This is a learning tool—feel free to modify it:

- Add new entity types (e.g., suppliers, warehouses)
- Create custom test scenarios
- Build analytics visualizations using the ClickHouse data
- Add filters and search functionality
- Display pipeline latency metrics

## Technical Details

### Built With

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **shadcn/ui** - Component library
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety

### API Communication

The test client communicates with your OLTP API via standard REST endpoints:

```typescript
// Create customer
POST /api/customers
Content-Type: application/json
{
  "email": "user@example.com",
  "name": "John Doe",
  "country": "USA",
  "city": "New York"
}

// Create order
POST /api/orders
Content-Type: application/json
{
  "customer_id": 1,
  "status": "pending",
  "total": 299.99
}

// Update order
PATCH /api/orders/123
Content-Type: application/json
{
  "status": "shipped"
}

// Delete order
DELETE /api/orders/123
```

### Building for Production

```bash
# Build optimized static assets
pnpm build

# Preview production build
pnpm preview
```

The built files will be in the `dist/` directory. You can serve them with any static file server or CDN.

Note: This is a development/testing tool, not meant for production use. For a real analytics dashboard, you'd query ClickHouse directly rather than going through the OLTP API.

## Contributing

Found a bug? Have an idea for improvement?

- **Issues**: Open an issue in the main repository
- **Pull Requests**: Contributions welcome for new features or better UI/UX
- **Documentation**: Help improve this README with your learnings

## License

Part of the [oltp-to-olap-showcase](../../README.md) project. See repository root for license details.

---

**Questions?** Check the [main documentation](../../README.md) or open an issue in the repository.

**Ready to build your own?** Use the [TypeORM](../typeorm-example/README.md) or [SQLAlchemy](../sqlalchemy-example/README.md) examples as starting points for your application.
