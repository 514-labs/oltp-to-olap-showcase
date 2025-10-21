import { Sequelize } from 'sequelize';
import { initModels, Customer, Product, Order, OrderItem } from './models';

// Initialize Sequelize
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
});
