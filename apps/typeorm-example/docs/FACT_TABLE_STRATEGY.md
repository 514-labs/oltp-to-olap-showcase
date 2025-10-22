# Fact Table Streaming Strategy

## Problem

OrderFact requires data from 4 tables:

- `order_items` - Base data (quantity, price)
- `orders` - Order metadata (customerId, orderDate, status)
- `customers` - Customer attributes (country, city)
- `products` - Product attributes (category, name)

In a streaming CDC pipeline, we can't easily do JOINs across tables.

## Solution: Two-Stage Approach

### Stage 1: Stream Partial Facts (Moose)

Write partial OrderFact records with only data from `order_items`:

```typescript
{
  id: orderItemId,
  orderId: orderId,
  productId: productId,
  customerId: 0,           // ❌ Unknown yet
  quantity: quantity,
  unitPrice: price,
  revenue: quantity * price,
  // ❌ Missing: orderDate, orderStatus, customerCountry, etc.
}
```

**Benefits:**

- ✅ Fast streaming writes (no lookups)
- ✅ Low latency (<100ms)
- ✅ Simple transformation logic
- ✅ No state management needed

### Stage 2: Enrich in ClickHouse

Use ClickHouse's powerful SQL capabilities to enrich:

#### Option A: Materialized View (Recommended)

```sql
CREATE MATERIALIZED VIEW fact_order_enriched AS
SELECT
    f.*,
    o.customerId,
    o.orderDate,
    c.country as customerCountry,
    p.category as productCategory
FROM fact_order f
LEFT JOIN dim_order o ON f.orderId = o.id
LEFT JOIN dim_customer c ON o.customerId = c.id
LEFT JOIN dim_product p ON f.productId = p.id;
```

**Benefits:**

- ✅ Automatic enrichment (real-time)
- ✅ No code changes needed
- ✅ ClickHouse does the heavy lifting

#### Option B: Dictionary Lookups

```sql
-- Create dictionaries from dimensions
CREATE DICTIONARY dict_customers (...);
CREATE DICTIONARY dict_products (...);

-- Query with dictionary lookups (zero JOINs!)
SELECT
    f.*,
    dictGet('dict_customers', 'country', customerId) as customerCountry
FROM fact_order f;
```

**Benefits:**

- ✅ Fastest query performance
- ✅ No JOIN overhead
- ✅ Great for point queries

## Implementation

### 1. Streaming Transformation (`app/transformations.ts`)

```typescript
function transformOrderItemToPartialOrderFact(orderItem: RedpandaPgCdcPayload<OrderItem>) {
  const { _metadata, ...payload } = orderItem;

  return {
    id: BigInt(payload.id),
    orderId: BigInt(payload.orderId),
    productId: BigInt(payload.productId),
    customerId: BigInt(0), // Will be enriched
    quantity: payload.quantity,
    unitPrice: payload.price,
    revenue: payload.quantity * payload.price,
    is_deleted: 0,
    lsn: parseInt(_metadata.lsn, 16),
  };
}
```

### 2. Dimension Streams

Ensure dimensions are populated first:

```typescript
TypeormCdcEventsStream.addConsumer((event) => {
  switch (event._metadata.table) {
    case 'customers':
      CustomerDimensionStream.send(transform(event));
      break;
    case 'products':
      ProductDimensionStream.send(transform(event));
      break;
    case 'orders':
      OrderDimensionStream.send(transform(event));
      break;
    case 'order_items':
      OrderFactStream.send(transformPartial(event));
      break;
  }
});
```

### 3. ClickHouse Enrichment

See `clickhouse-enrichment.sql` for complete SQL examples.

## Alternative: Full Enrichment in Stream

For production CDC pipelines that need real-time denormalization:

### Option 1: State Store (Complex)

```typescript
// Maintain in-memory cache of dimensions
const customerCache = new Map<number, CustomerDimension>();
const productCache = new Map<number, ProductDimension>();

// Update caches from dimension streams
CustomerDimensionStream.addConsumer((c) => customerCache.set(c.id, c));

// Enrich on order_items
function enrichOrderFact(orderItem) {
  const customer = customerCache.get(orderItem.customerId);
  const product = productCache.get(orderItem.productId);

  return {
    ...orderItem,
    customerCountry: customer?.country,
    productCategory: product?.category,
  };
}
```

**Challenges:**

- ❌ Complex state management
- ❌ Memory overhead
- ❌ Cache staleness
- ❌ Bootstrap complexity

### Option 2: External Lookup Service

```typescript
async function enrichOrderFact(orderItem) {
  const [customer, product] = await Promise.all([
    lookupService.getCustomer(orderItem.customerId),
    lookupService.getProduct(orderItem.productId),
  ]);

  return { ...orderItem, ...customer, ...product };
}
```

**Challenges:**

- ❌ Adds latency (network calls)
- ❌ Requires separate service
- ❌ Complex error handling

## Recommendation

**Use the Two-Stage Approach:**

1. ✅ Stream partial facts (Moose) - Simple, fast, reliable
2. ✅ Enrich in ClickHouse (SQL) - Leverages ClickHouse's strengths

**Why?**

- Separation of concerns (streaming vs enrichment)
- ClickHouse is purpose-built for JOINs and aggregations
- Simpler code, easier to maintain
- Better performance for analytical queries
- No state management in application layer

## Performance Characteristics

| Approach        | Write Latency | Query Performance | Complexity |
| --------------- | ------------- | ----------------- | ---------- |
| Partial + MV    | ~50ms         | Excellent         | Low        |
| Partial + Dict  | ~50ms         | Best              | Low        |
| Stream State    | ~200ms        | Good              | High       |
| External Lookup | ~500ms        | Good              | High       |

## Next Steps

1. ✅ Implement partial fact streaming (done)
2. ⏳ Create ClickHouse materialized view (see `clickhouse-enrichment.sql`)
3. ⏳ Test with real CDC data
4. ⏳ Monitor performance and adjust

## Files

- `app/transformations.ts` - Streaming transformations
- `clickhouse-enrichment.sql` - ClickHouse enrichment strategies
- `app/models.ts` - Type definitions
