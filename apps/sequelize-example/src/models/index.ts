import { Sequelize, DataTypes, Model, Optional } from 'sequelize';

/**
 * Sequelize Models - OLTP Schema
 * E-commerce system with normalized tables
 */

// Customer Model
interface CustomerAttributes {
  id: number;
  email: string;
  name: string;
  country: string;
  city: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CustomerCreationAttributes extends Optional<CustomerAttributes, 'id'> {}

export class Customer extends Model<CustomerAttributes, CustomerCreationAttributes> implements CustomerAttributes {
  declare id: number;
  declare email: string;
  declare name: string;
  declare country: string;
  declare city: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

// Product Model
interface ProductAttributes {
  id: number;
  name: string;
  category: string;
  price: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProductCreationAttributes extends Optional<ProductAttributes, 'id'> {}

export class Product extends Model<ProductAttributes, ProductCreationAttributes> implements ProductAttributes {
  declare id: number;
  declare name: string;
  declare category: string;
  declare price: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

// Order Model
interface OrderAttributes {
  id: number;
  customerId: number;
  orderDate?: Date;
  status: string;
  total: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface OrderCreationAttributes extends Optional<OrderAttributes, 'id'> {}

export class Order extends Model<OrderAttributes, OrderCreationAttributes> implements OrderAttributes {
  declare id: number;
  declare customerId: number;
  declare orderDate: Date;
  declare status: string;
  declare total: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

// OrderItem Model
interface OrderItemAttributes {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface OrderItemCreationAttributes extends Optional<OrderItemAttributes, 'id'> {}

export class OrderItem extends Model<OrderItemAttributes, OrderItemCreationAttributes> implements OrderItemAttributes {
  declare id: number;
  declare orderId: number;
  declare productId: number;
  declare quantity: number;
  declare price: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

// Initialize models function
export function initModels(sequelize: Sequelize) {
  Customer.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      country: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'customers',
      timestamps: true,
    }
  );

  Product.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      price: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'products',
      timestamps: true,
    }
  );

  Order.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: Customer,
          key: 'id',
        },
      },
      orderDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      total: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'orders',
      timestamps: true,
    }
  );

  OrderItem.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: Order,
          key: 'id',
        },
      },
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: Product,
          key: 'id',
        },
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      price: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'order_items',
      timestamps: true,
    }
  );

  // Define associations
  Customer.hasMany(Order, { foreignKey: 'customerId', as: 'orders' });
  Order.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

  Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
  OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

  Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });
  OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

  return { Customer, Product, Order, OrderItem };
}
