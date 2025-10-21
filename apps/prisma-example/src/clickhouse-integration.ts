import { PrismaClient } from '@prisma/client';
import type { Customer, Product, Order, OrderItem } from '@prisma/client';
import {
  StarSchemaGenerator,
  generateDimensionFromModel,
  generateFactFromModel,
  defineDimension,
  defineFact,
} from '@oltp-olap/shared';

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

export async function generateClickHouseSchemas() {
  console.log('=== Prisma to ClickHouse Schema Generation ===\n');

  const prisma = new PrismaClient();

  try {
    // Step 1: Fetch sample records to infer schema
    console.log('Step 1: Fetching sample records for type inference...');

    const sampleCustomer = await prisma.customer.findFirst();
    const sampleProduct = await prisma.product.findFirst();
    const sampleOrderItem = await prisma.orderItem.findFirst({
      include: { order: true },
    });

    if (!sampleCustomer || !sampleProduct || !sampleOrderItem) {
      console.log('No data found. Please seed the database first.');
      return;
    }

    // Enrich order item with customer data for fact table
    const sampleSalesFact: SalesFact = {
      ...sampleOrderItem,
      customerId: sampleOrderItem.order.customerId,
      orderDate: sampleOrderItem.order.orderDate,
    };

    console.log('✓ Sample records fetched\n');

    // Step 2: Generate ClickHouse schemas using StarSchemaGenerator
    console.log('Step 2: Generating ClickHouse star schema...\n');

    const schemaGenerator = new StarSchemaGenerator();

    // Add Customer Dimension
    schemaGenerator.addDimension('dim_customer', sampleCustomer, {
      keyField: 'id',
      attributes: ['email', 'name', 'country', 'city', 'createdAt'],
    });

    console.log('✓ Customer dimension defined');

    // Add Product Dimension
    schemaGenerator.addDimension('dim_product', sampleProduct, {
      keyField: 'id',
      attributes: ['name', 'category', 'price', 'createdAt'],
    });

    console.log('✓ Product dimension defined');

    // Add Sales Fact
    schemaGenerator.addFact('fact_sales', sampleSalesFact, {
      measures: ['quantity', 'price'],
      dimensionKeys: ['customerId', 'productId'],
      timestampField: 'orderDate',
    });

    console.log('✓ Sales fact defined\n');

    // Step 3: Generate DDL
    console.log('Step 3: Generating ClickHouse DDL...\n');
    console.log('--- Generated DDL ---');
    console.log(schemaGenerator.generateDDL());

    // Step 4: Show type-safe dimension and fact configurations
    console.log('\n--- Type-Safe Configuration Examples ---\n');

    // Type-safe dimension configuration
    const customerDimConfig = defineDimension<CustomerModel, 'email' | 'name' | 'country' | 'city'>({
      name: 'customer',
      sourceTable: 'Customer',
      keyField: 'id',
      attributes: ['email', 'name', 'country', 'city'] as const,
    });

    console.log('Customer Dimension Config:', JSON.stringify(customerDimConfig, null, 2));

    // Type-safe fact configuration
    const salesFactConfig = defineFact<SalesFact, 'quantity' | 'price', {
      customer: number;
      product: number;
    }>({
      name: 'sales',
      sourceTable: 'OrderItem',
      measures: [
        { field: 'quantity', aggregation: 'sum' },
        { field: 'price', aggregation: 'sum' },
      ] as const,
      dimensionLinks: [
        { dimensionName: 'customer', foreignKey: 'customerId' },
        { dimensionName: 'product', foreignKey: 'productId' },
      ] as const,
      timestampField: 'orderDate',
    });

    console.log('\nSales Fact Config:', JSON.stringify(salesFactConfig, null, 2));

    // Step 5: Show individual table generation
    console.log('\n\n--- Individual Table Generation ---\n');

    const { table: customerTable, ddl: customerDDL } = generateDimensionFromModel(
      'dim_customer',
      sampleCustomer,
      {
        keyField: 'id',
        attributes: ['email', 'name', 'country', 'city'],
      }
    );

    console.log('Customer Dimension DDL:');
    console.log(customerDDL);

    const { table: salesTable, ddl: salesDDL } = generateFactFromModel(
      'fact_sales',
      sampleSalesFact,
      {
        measures: ['quantity', 'price'],
        dimensionKeys: ['customerId', 'productId'],
        timestampField: 'orderDate',
      }
    );

    console.log('\nSales Fact DDL:');
    console.log(salesDDL);

    // Step 6: Show deployment script generation
    console.log('\n\n--- Deployment Script ---\n');
    generateDeploymentScript(schemaGenerator);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Generates a deployment script for ClickHouse
 */
function generateDeploymentScript(generator: StarSchemaGenerator): void {
  const script = `#!/bin/bash
# ClickHouse Deployment Script
# Generated from Prisma models

set -e

echo "Deploying ClickHouse schema..."

# Set ClickHouse connection
CLICKHOUSE_HOST=\${CLICKHOUSE_HOST:-localhost}
CLICKHOUSE_PORT=\${CLICKHOUSE_PORT:-8123}
CLICKHOUSE_USER=\${CLICKHOUSE_USER:-default}
CLICKHOUSE_PASSWORD=\${CLICKHOUSE_PASSWORD:-}

# Function to execute ClickHouse query
execute_query() {
  local query=$1
  curl -X POST "http://\${CLICKHOUSE_HOST}:\${CLICKHOUSE_PORT}" \\
    --user "\${CLICKHOUSE_USER}:\${CLICKHOUSE_PASSWORD}" \\
    --data-binary "$query"
}

# Create database if not exists
execute_query "CREATE DATABASE IF NOT EXISTS oltp_to_olap"

# Deploy schema
cat <<'EOF' | execute_query
USE oltp_to_olap;

${generator.generateDDL()}
EOF

echo "Schema deployed successfully!"
`;

  console.log(script);
}

// Export for use in main script
export { CustomerModel, ProductModel, OrderItemModel, SalesFact };
