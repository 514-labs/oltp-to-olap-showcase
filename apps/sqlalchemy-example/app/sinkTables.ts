/**
 * ClickHouse Table Definitions
 *
 * These tables receive data from CDC streams
 */

import { OlapTable, ClickHouseEngines } from '@514labs/moose-lib';
import { CustomerDimension, ProductDimension, OrderDimension, OrderItemFact, CdcFields } from './models';

// ==================== DIMENSION TABLES ====================

export const CustomerDimensionTable = new OlapTable<CustomerDimension & CdcFields>(
  'dim_customer',
  {
    orderByFields: ['id'],
    engine: ClickHouseEngines.ReplacingMergeTree,
    ver: 'lsn',
    isDeleted: 'is_deleted',
  }
);

export const ProductDimensionTable = new OlapTable<ProductDimension & CdcFields>(
  'dim_product',
  {
    orderByFields: ['id'],
    engine: ClickHouseEngines.ReplacingMergeTree,
    ver: 'lsn',
    isDeleted: 'is_deleted',
  }
);

export const OrderDimensionTable = new OlapTable<OrderDimension & CdcFields>('dim_order', {
  orderByFields: ['id'],
  engine: ClickHouseEngines.ReplacingMergeTree,
  ver: 'lsn',
  isDeleted: 'is_deleted',
});

// ==================== FACT TABLE ====================

export const OrderItemTable = new OlapTable<OrderItemFact & CdcFields>('fact_order_item', {
  orderByFields: ['id', 'order_id', 'product_id'],
  engine: ClickHouseEngines.ReplacingMergeTree,
  ver: 'lsn',
  isDeleted: 'is_deleted',
});
