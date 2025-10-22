import {
  CustomerDimension,
  ProductDimension,
  OrderItemFact,
  CdcFields,
  OrderDimension,
} from './models';
import { OlapTable, ClickHouseEngines } from '@514labs/moose-lib';

// ==================== OLAP TABLE DEFINITIONS ====================

export const CustomerDimensionTable = new OlapTable<CustomerDimension & CdcFields>('dim_customer', {
  orderByFields: ['id'],
  engine: ClickHouseEngines.ReplacingMergeTree,
  ver: 'lsn',
  isDeleted: 'is_deleted',
  // ClickHouse: ReplacingMergeTree for Type 1 SCD (automatic deduplication)
});

export const ProductDimensionTable = new OlapTable<ProductDimension & CdcFields>('dim_product', {
  orderByFields: ['id'],
  // ClickHouse: ReplacingMergeTree for Type 1 SCD
});

export const OrderDimensionTable = new OlapTable<OrderDimension & CdcFields>('dim_order', {
  orderByFields: ['id'],
  engine: ClickHouseEngines.ReplacingMergeTree,
  ver: 'lsn',
  isDeleted: 'is_deleted',
  // ClickHouse: ReplacingMergeTree for Type 1 SCD (automatic deduplication)
});

export const OrderItemTable = new OlapTable<OrderItemFact & CdcFields>('fact_order_item', {
  orderByFields: ['id', 'orderId', 'productId'],
  engine: ClickHouseEngines.ReplacingMergeTree,
  ver: 'lsn',
  isDeleted: 'is_deleted',
});
