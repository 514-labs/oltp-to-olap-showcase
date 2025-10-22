/**
 * ClickHouse Dictionaries for Fact Table Enrichment
 *
 * Dictionaries provide fast in-memory lookups to enrich fact tables with dimension data.
 * Used to denormalize OrderFact with customer, product, and order attributes.
 *
 * Configuration:
 * - LAYOUT(FLAT): Optimized for small-medium dimensions (<1M rows)
 * - LIFETIME: Cache refresh interval (5-10 minutes)
 * - SOURCE: Pulls data from dimension tables in ClickHouse
 */

import { OlapTable, ClickHouseEngines, MaterializedView, sql } from '@514labs/moose-lib';
import { OrderFact, CdcFields, OrderDimension, OrderItemFact } from './models';
import { Dictionary } from './dictionaryBuilder';
import { OrderDimensionTable, OrderItemTable } from './sinkTables';
// ============================================================================
// CUSTOMER DICTIONARY
// ============================================================================
// Provides customer attributes (country, city) for fact table enrichment

export const dictCustomers = Dictionary('dict_customers', {
  fields: {
    id: 'UInt64',
    country: 'String',
    city: 'String',
  },
  source: {
    table: 'dim_customer',
    where: 'is_deleted = 0',
  },
});

// ============================================================================
// PRODUCT DICTIONARY
// ============================================================================
// Provides product attributes (category, name) for fact table enrichment

export const dictProducts = Dictionary('dict_products', {
  fields: {
    id: 'UInt64',
    category: 'String',
    name: 'String',
  },
  source: {
    table: 'dim_product',
    where: 'is_deleted = 0',
  },
});

// ============================================================================
// ORDER DICTIONARY
// ============================================================================
// Provides order attributes (customerId, orderDate, status) for fact table enrichment

export const dictOrders = Dictionary('dict_orders', {
  fields: {
    id: 'UInt64',
    customerId: 'UInt64',
    orderDate: 'DateTime',
    status: 'String',
  },
  source: {
    table: 'dim_order',
    where: 'is_deleted = 0',
  },
});

export const JoinedOrders = new OlapTable<OrderFact & CdcFields>('joined_orders', {
  engine: ClickHouseEngines.ReplacingMergeTree,
  orderByFields: ['id'],
  ver: 'lsn',
  isDeleted: 'is_deleted',
});

export const OrderFactEnrichedView = new MaterializedView<OrderFact & CdcFields>({
  materializedViewName: 'join_orders_mv',
  selectStatement: sql`
    SELECT
    ${OrderItemTable.columns.id} as id,
    ${OrderItemTable.columns.orderId} as orderId,
    ${OrderItemTable.columns.productId} as productId,
    ${OrderItemTable.columns.quantity} as quantity,
    ${OrderItemTable.columns.price} as unitPrice,
    ${OrderItemTable.columns.quantity} * ${OrderItemTable.columns.price} as revenue,

    -- Lookup from dictionaries
    dictGet('dict_orders', 'customerId', oi.orderId) as customerId,
    dictGet('dict_orders', 'orderDate', oi.orderId) as orderDate,
    dictGet('dict_orders', 'status', oi.orderId) as orderStatus,

    dictGet('dict_customers', 'country',
        dictGet('dict_orders', 'customerId', oi.orderId)
    ) as customerCountry,

    dictGet('dict_customers', 'city',
        dictGet('dict_orders', 'customerId', oi.orderId)
    ) as customerCity,

    dictGet('dict_products', 'category', oi.productId) as productCategory,
    dictGet('dict_products', 'name', oi.productId) as productName,

    ${OrderItemTable.columns.is_deleted},
    ${OrderItemTable.columns.lsn}
    FROM ${OrderItemTable} oi
    `,
  selectTables: [OrderItemTable, dictCustomers, dictProducts, dictOrders],
  targetTable: JoinedOrders,
});
