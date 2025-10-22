#!/usr/bin/env tsx
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Customer, Product, Order, OrderItem } from './entities';

/**
 * Standalone Database Setup Script
 *
 * Creates PostgreSQL tables for TypeORM entities.
 * This runs independently of the API server.
 *
 * Usage:
 *   pnpm setup-db
 *   npm run setup-db
 */

// Initialize TypeORM DataSource (PostgreSQL with CDC support)
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'typeorm_db',
  synchronize: true, // Creates tables based on entities
  logging: true,
  entities: [Customer, Product, Order, OrderItem],
});

async function setupDatabase() {
  console.log('🔧 Starting database setup...\n');

  try {
    // Initialize connection
    console.log('📡 Connecting to PostgreSQL...');
    await AppDataSource.initialize();
    console.log('✅ Connected to PostgreSQL\n');

    // TypeORM synchronize automatically creates tables
    console.log('📋 Creating/updating tables...');
    console.log('   Tables: customers, products, orders, order_items\n');

    // Verify tables were created
    const queryRunner = AppDataSource.createQueryRunner();
    const tables = await queryRunner.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('customers', 'products', 'orders', 'order_items')
      ORDER BY table_name
    `);
    await queryRunner.release();

    console.log('✅ Database setup complete!\n');
    console.log('📊 Created tables:');
    tables.forEach((row: { table_name: string }) => {
      console.log(`   - ${row.table_name}`);
    });

    console.log('\n🎯 Next steps:');
    console.log('   1. CDC setup will automatically create publication');
    console.log('   2. Redpanda Connect will start streaming CDC events');
    console.log('   3. Start the API: pnpm dev');

    // Close connection
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run setup
setupDatabase();
