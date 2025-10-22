/**
 * OLAP Type Definitions Converted from SQLAlchemy Models
 *
 * These types represent the OLAP schema for ClickHouse,
 * converted from SQLAlchemy OLTP models.
 *
 * Conversion Rules:
 * - Remove relationships (orders, items, customer, product)
 * - Convert Integer → UInt64 (ClickHouse optimized)
 * - Convert Numeric/Decimal → Float64
 * - Convert DateTime → DateTime
 * - Add CDC metadata fields (is_deleted, lsn)
 */

import { UInt64, UInt8 } from '@514labs/moose-lib';

// ==================== CDC METADATA ====================

export interface RedpandaPgCdcPayload<T> {
  _metadata: {
    table: string;
    operation: 'delete' | 'insert' | 'update' | 'read';
    lsn: string; // PostgreSQL LSN as hex string
  };
  // Rest of payload matches the table structure
  [key: string]: any;
}

export interface CdcFields {
  is_deleted: UInt8;
  lsn: UInt64;
}

// ==================== DIMENSION TABLES ====================

/**
 * Customer Dimension
 * Converted from SQLAlchemy Customer model
 */
export interface CustomerDimension {
  id: UInt64; // Integer → UInt64
  email: string;
  name: string;
  country: string;
  city: string;
  created_at: Date;
  // Removed: orders (relationship)
}

/**
 * Product Dimension
 * Converted from SQLAlchemy Product model
 */
export interface ProductDimension {
  id: UInt64; // Integer → UInt64
  name: string;
  category: string;
  price: number; // Numeric(10,2) → Float64
  created_at: Date;
  // Removed: order_items (relationship)
}

/**
 * Order Dimension
 * Converted from SQLAlchemy Order model
 */
export interface OrderDimension {
  id: UInt64; // Integer → UInt64
  customer_id: UInt64; // ForeignKey → UInt64
  order_date: Date; // DateTime(timezone=True) → DateTime
  status: string;
  total: number; // Numeric(10,2) → Float64
  // Removed: customer, items (relationships)
}

/**
 * OrderItem Fact
 * Converted from SQLAlchemy OrderItem model
 *
 * This is the grain of our fact table (one row per order line item)
 */
export interface OrderItemFact {
  id: UInt64; // Integer → UInt64
  order_id: UInt64; // ForeignKey → UInt64
  product_id: UInt64; // ForeignKey → UInt64
  quantity: number; // Integer → Float64 for ClickHouse
  price: number; // Numeric(10,2) → Float64 (unit price)
  // Removed: order, product (relationships)
}

// ==================== ENRICHED FACT TABLE ====================

/**
 * Order Fact Enriched
 * Denormalized fact table with dimension attributes
 *
 * Created by joining OrderItem with dimension tables via dictionaries:
 * - Customer attributes (country, city)
 * - Product attributes (category, name)
 * - Order attributes (date, status)
 */
export interface OrderFact {
  id: UInt64; // OrderItem ID
  order_id: UInt64;
  product_id: UInt64;
  customer_id: UInt64;

  // Time dimension
  order_date: Date;

  // Measures
  quantity: number;
  unit_price: number;
  revenue: number; // Calculated: quantity * unit_price

  // Denormalized attributes from dimensions
  order_status: string; // From Order
  customer_country: string; // From Customer
  customer_city: string; // From Customer
  product_category: string; // From Product
  product_name: string; // From Product
}
