import { PrismaClient } from '@prisma/client';
import type { Customer, Product, Order, OrderItem } from '@prisma/client';

/**
 * Prisma Example: Type-Inferred ClickHouse Schema Generation
 *
 * This example demonstrates:
 * 1. Inferring TypeScript types from Prisma models
 * 2. Using MooseStack OLAP patterns to generate ClickHouse schemas
 * 3. Creating optimized OLAP tables from OLTP models
 * 4. Generating DDL for deployment
 */

// Infer types from Prisma Client
type CustomerModel = Customer;
type ProductModel = Product;
type OrderModel = Order;
type OrderItemModel = OrderItem;

// Enriched type for fact table (includes joined data)
type SalesFact = OrderItem & {
  customerId: number;
  orderDate: Date;
};
