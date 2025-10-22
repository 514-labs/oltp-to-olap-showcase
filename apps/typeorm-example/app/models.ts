import { UInt64, UInt8 } from '@514labs/moose-lib';
import { Customer, Order, Product, OrderItem } from '../src/entities';

// Helper: Extract field types from TypeORM entities
type ExtractFields<T> = {
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
};

export type RedpandaPgCdcPayload<T> = {
  _metadata: {
    table: string;
    operation: 'delete' | 'insert' | 'update' | 'read';
    lsn: string; // PostgreSQL LSN is a hex string like '0/1234567'
  };
} & T;

export type CdcFields = {
  is_deleted: UInt8;
  lsn: UInt64;
};

type CustomerFields = ExtractFields<Customer>;
type OrderFields = ExtractFields<Order>;
type ProductFields = ExtractFields<Product>;
type OrderItemFields = ExtractFields<OrderItem>;

// ==================== DIMENSION TABLES ====================

export type CustomerDimension = Omit<CustomerFields, 'id' | 'orders'> & { id: UInt64 };

export type ProductDimension = Omit<ProductFields, 'id' | 'orderItems'> & { id: UInt64 };

export type OrderDimension = Omit<OrderFields, 'id' | 'customer' | 'items'> & { id: UInt64 };

export type OrderItemFact = Omit<OrderItemFields, 'id' | 'order' | 'product'> & { id: UInt64 };

// ==================== FACT TABLES ====================

/**
 * Order Fact Table
 * Grain: One line item in an order
 *
 * Denormalized with:
 * - Foreign keys to dimensions (customerId, productId)
 * - Frequently-queried attributes (orderStatus, customerCountry, productCategory)
 * - Pre-calculated measures (revenue)
 */
export interface OrderFact {
  id: UInt64; // Primary key (orderItemId)

  // Foreign keys to dimensions (converted to UInt64)
  customerId: CustomerDimension['id'];
  productId: ProductDimension['id'];
  orderId: UInt64;

  // Time dimensions (for partitioning and grouping)
  orderDate: OrderFields['orderDate'];

  // Measures (borrowed from OrderItem)
  quantity: OrderItemFields['quantity'];
  unitPrice: OrderItemFields['price'];
  revenue: number; // Pre-calculated: quantity * unitPrice

  // Denormalized attributes (frequently queried, avoid joins)
  orderStatus: OrderFields['status']; // From Order
  customerCountry: CustomerFields['country']; // From Customer
  customerCity: CustomerFields['city']; // From Customer
  productCategory: ProductFields['category']; // From Product
  productName: ProductFields['name']; // From Product
}
