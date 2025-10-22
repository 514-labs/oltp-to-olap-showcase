-- ClickHouse Enrichment Strategy for OrderFact Table
-- ======================================================
-- 
-- The streaming transformation writes partial OrderFact records with only
-- data available from order_items. This file shows how to enrich with
-- denormalized fields from dimension tables.

-- Option 1: Materialized View with JOINs (Recommended)
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS fact_order_enriched
ENGINE = ReplacingMergeTree(lsn)
ORDER BY (orderDate, customerId, productId)
PARTITION BY toYYYYMM(orderDate)
AS SELECT
    -- From fact_order (partial)
    f.id,
    f.orderId,
    f.productId,
    f.quantity,
    f.unitPrice,
    f.revenue,
    f.is_deleted,
    f.lsn,
    
    -- From dim_order (JOIN)
    o.customerId,
    o.orderDate,
    o.status as orderStatus,
    
    -- From dim_customer (JOIN via order)
    c.country as customerCountry,
    c.city as customerCity,
    
    -- From dim_product (JOIN)
    p.category as productCategory,
    p.name as productName
    
FROM fact_order f
LEFT JOIN dim_order o ON f.orderId = o.id
LEFT JOIN dim_customer c ON o.customerId = c.id
LEFT JOIN dim_product p ON f.productId = p.id
WHERE f.is_deleted = 0;


-- Option 2: Dictionary Lookups (Fastest for point queries)
-- =========================================================

-- Create dictionaries from dimension tables
CREATE DICTIONARY IF NOT EXISTS dict_customers
(
    id UInt64,
    country String,
    city String
)
PRIMARY KEY id
SOURCE(CLICKHOUSE(
    HOST 'localhost'
    PORT 9000
    USER 'default'
    TABLE 'dim_customer'
    DB 'local'
))
LAYOUT(FLAT())
LIFETIME(MIN 300 MAX 600);

CREATE DICTIONARY IF NOT EXISTS dict_products
(
    id UInt64,
    category String,
    name String
)
PRIMARY KEY id
SOURCE(CLICKHOUSE(
    HOST 'localhost'
    PORT 9000
    USER 'default'
    TABLE 'dim_product'
    DB 'local'
))
LAYOUT(FLAT())
LIFETIME(MIN 300 MAX 600);

CREATE DICTIONARY IF NOT EXISTS dict_orders
(
    id UInt64,
    customerId UInt64,
    orderDate DateTime,
    status String
)
PRIMARY KEY id
SOURCE(CLICKHOUSE(
    HOST 'localhost'
    PORT 9000
    USER 'default'
    TABLE 'dim_order'
    DB 'local'
))
LAYOUT(COMPLEX_KEY_HASHED())
LIFETIME(MIN 300 MAX 600);

-- Query using dictionaries (no JOINs needed!)
SELECT
    f.id,
    f.orderId,
    f.productId,
    f.quantity,
    f.unitPrice,
    f.revenue,
    
    -- Lookup from dictionaries
    dictGet('dict_orders', 'customerId', f.orderId) as customerId,
    dictGet('dict_orders', 'orderDate', f.orderId) as orderDate,
    dictGet('dict_orders', 'status', f.orderId) as orderStatus,
    
    dictGet('dict_customers', 'country', 
        dictGet('dict_orders', 'customerId', f.orderId)
    ) as customerCountry,
    
    dictGet('dict_customers', 'city',
        dictGet('dict_orders', 'customerId', f.orderId)
    ) as customerCity,
    
    dictGet('dict_products', 'category', f.productId) as productCategory,
    dictGet('dict_products', 'name', f.productId) as productName
    
FROM fact_order f
WHERE f.is_deleted = 0;


-- Option 3: Create a final enriched fact table (Best for analytics)
-- ==================================================================

-- Step 1: Keep fact_order as staging table (partial data)
-- Step 2: Create final enriched table

CREATE TABLE IF NOT EXISTS fact_order_final
(
    id UInt64,
    orderId UInt64,
    customerId UInt64,
    productId UInt64,
    
    -- Time dimensions
    orderDate DateTime,
    
    -- Measures
    quantity Int32,
    unitPrice Decimal(10,2),
    revenue Decimal(10,2),
    
    -- Denormalized attributes
    orderStatus String,
    customerCountry String,
    customerCity String,
    productCategory String,
    productName String,
    
    -- CDC fields
    is_deleted UInt8,
    lsn UInt64
)
ENGINE = ReplacingMergeTree(lsn)
ORDER BY (orderDate, customerId, productId)
PARTITION BY toYYYYMM(orderDate);

-- Step 3: Populate with enriched data (run periodically or via trigger)
INSERT INTO fact_order_final
SELECT
    f.id,
    f.orderId,
    o.customerId,
    f.productId,
    o.orderDate,
    f.quantity,
    f.unitPrice,
    f.revenue,
    o.status as orderStatus,
    c.country as customerCountry,
    c.city as customerCity,
    p.category as productCategory,
    p.name as productName,
    f.is_deleted,
    f.lsn
FROM fact_order f
LEFT JOIN dim_order o ON f.orderId = o.id
LEFT JOIN dim_customer c ON o.customerId = c.id
LEFT JOIN dim_product p ON f.productId = p.id
WHERE f.is_deleted = 0
  AND f.lsn > (SELECT COALESCE(MAX(lsn), 0) FROM fact_order_final);


-- Recommended Approach for Production
-- ====================================
-- 
-- 1. Use Moose streams to write partial facts (fast, low latency)
-- 2. Use ClickHouse materialized views to enrich (automatic, real-time)
-- 3. For complex enrichment, use scheduled jobs (dbt, ClickHouse CRON)
-- 
-- Benefits:
-- - Streaming writes are simple and fast
-- - ClickHouse handles the heavy lifting (JOINs, aggregations)
-- - Separation of concerns (stream processing vs analytical enrichment)

