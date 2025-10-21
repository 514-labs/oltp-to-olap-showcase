import { Sequelize } from 'sequelize';
import { initModels, Customer, Product, Order, OrderItem } from './models';

/**
 * Sequelize Example: OLTP to OLAP Transformation
 *
 * This example demonstrates how to:
 * 1. Define OLTP models using Sequelize with associations
 * 2. Query normalized data with eager loading
 * 3. Transform to OLAP structures for analytics
 */

// Initialize Sequelize
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
});
