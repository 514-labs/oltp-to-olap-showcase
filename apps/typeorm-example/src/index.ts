import 'reflect-metadata';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { DataSource, DeepPartial } from 'typeorm';
import { apiReference } from '@scalar/express-api-reference';
import { Customer, Product, Order, OrderItem } from './entities';
import { openApiSpec } from './openapi';
import {
  // Shared middleware
  requestContextMiddleware,
  loggingMiddleware,
  errorHandler,
  notFoundHandler,
  corsOptions,
  helmetOptions,
  // Shared routes
  createHealthRoutes,
  createDocsRoutes,
  createRootRoutes,
  createUtilityRoutes,
  // Shared utilities
  sendSuccess,
  sendError,
  sendCreated,
  sendNoContent,
  sendNotFound,
  sendValidationError,
  // Shared types
  AsyncHandler,
  ValidationHandler,
  // Server utilities
  createIdempotentServer,
  ServerConfig,
} from '@oltp-olap/shared';

/**
 * TypeORM API Server
 *
 * A simple Express.js API server with CRUD endpoints for each TypeORM model.
 * Uses shared middleware, routes, and utilities for common functionality.
 */

// Initialize TypeORM DataSource
const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: './typeorm.db',
  synchronize: true,
  logging: false,
  entities: [Customer, Product, Order, OrderItem],
});

// AI story = inspect the data in the OLTP Customer table to see the actual sample data,
// then determine the right ClickHouse optimized types for each column & default values.
type CustomerNonNullable = NonNullable<typeof Customer> & {
  id: number;
  email: string;
  name: string;
  country: string;
  city: string;
  createdAt: Date;
  orders: Order[];
};

// establish database connection
async function initializeDatabase() {
  try {
    await AppDataSource.initialize();
    console.log('Data Source has been initialized!');
  } catch (error) {
    console.error('❌ Error during Data Source initialization:', error);
  }
}

initializeDatabase();

// Initialize Express app
const app = express();
const DEFAULT_PORT = parseInt(process.env.PORT || '3000', 10);
const APP_NAME = 'TypeORM API Server';
const VERSION = '1.0.0';

// Create idempotent server instance
const serverConfig: ServerConfig = {
  port: DEFAULT_PORT,
  app,
  name: APP_NAME,
  version: VERSION,
};

const idempotentServer = createIdempotentServer(serverConfig);

// Middleware
app.use(helmet(helmetOptions));
app.use(cors(corsOptions));
app.use(express.json());
app.use(requestContextMiddleware);
app.use(loggingMiddleware);

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

const validateCustomer: ValidationHandler = (req, res, next) => {
  const { email, name, country, city } = req.body;
  if (!email || !name || !country || !city) {
    return sendValidationError(res, 'Email, name, country, and city are required');
  }
  next();
};

const validateProduct: ValidationHandler = (req, res, next) => {
  const { name, category, price } = req.body;
  if (!name || !category || price === undefined) {
    return sendValidationError(res, 'Name, category, and price are required');
  }
  next();
};

const validateOrder: ValidationHandler = (req, res, next) => {
  const { customerId, status, total } = req.body;
  if (!customerId || !status || total === undefined) {
    return sendValidationError(res, 'CustomerId, status, and total are required');
  }
  next();
};

const validateOrderItem: ValidationHandler = (req, res, next) => {
  const { orderId, productId, quantity, price } = req.body;
  if (!orderId || !productId || quantity === undefined || price === undefined) {
    return sendValidationError(res, 'OrderId, productId, quantity, and price are required');
  }
  next();
};

// ============================================================================
// CUSTOMER ENDPOINTS
// ============================================================================

// GET /api/customers - Get all customers
app.get('/api/customers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerRepo = AppDataSource.getRepository(Customer);
    const customers = await customerRepo.find({
      relations: ['orders'],
    });
    sendSuccess(res, customers);
  } catch (error) {
    next(error);
  }
});

// GET /api/customers/:id - Get customer by ID
app.get('/api/customers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerRepo = AppDataSource.getRepository(Customer);
    const customer = await customerRepo.findOne({
      where: { id: parseInt(req.params.id) },
      relations: ['orders', 'orders.items'],
    });

    if (!customer) {
      return sendNotFound(res, 'Customer');
    }

    sendSuccess(res, customer);
  } catch (error) {
    next(error);
  }
});

// POST /api/customers - Create new customer
app.post(
  '/api/customers',
  validateCustomer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerRepo = AppDataSource.getRepository(Customer);
      const customerData: DeepPartial<Customer> = req.body;

      const customer = customerRepo.create(customerData);
      const savedCustomer = await customerRepo.save(customer);

      sendCreated(res, savedCustomer);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/customers/:id - Update customer
app.put('/api/customers/:id', async (req, res, next) => {
  try {
    const customerRepo = AppDataSource.getRepository(Customer);
    const customerId = parseInt(req.params.id);
    const updateData = req.body;

    const customer = await customerRepo.findOne({ where: { id: customerId } });
    if (!customer) {
      return sendNotFound(res, 'Customer');
    }

    Object.assign(customer, updateData);
    const updatedCustomer = await customerRepo.save(customer);

    sendSuccess(res, updatedCustomer);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/customers/:id - Delete customer
app.delete('/api/customers/:id', async (req, res, next) => {
  try {
    const customerRepo = AppDataSource.getRepository(Customer);
    const customerId = parseInt(req.params.id);

    const result = await customerRepo.delete(customerId);
    if (result.affected === 0) {
      return sendNotFound(res, 'Customer');
    }

    sendNoContent(res);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// PRODUCT ENDPOINTS
// ============================================================================

// GET /api/products - Get all products
app.get('/api/products', async (req, res, next) => {
  try {
    const productRepo = AppDataSource.getRepository(Product);
    const products = await productRepo.find({
      relations: ['orderItems'],
    });
    sendSuccess(res, products);
  } catch (error) {
    next(error);
  }
});

// GET /api/products/:id - Get product by ID
app.get('/api/products/:id', async (req, res, next) => {
  try {
    const productRepo = AppDataSource.getRepository(Product);
    const product = await productRepo.findOne({
      where: { id: parseInt(req.params.id) },
      relations: ['orderItems', 'orderItems.order'],
    });

    if (!product) {
      return sendNotFound(res, 'Product');
    }

    sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
});

// POST /api/products - Create new product
app.post('/api/products', validateProduct, async (req, res, next) => {
  try {
    const productRepo = AppDataSource.getRepository(Product);
    const productData: DeepPartial<Product> = req.body;

    const product = productRepo.create(productData);
    const savedProduct = await productRepo.save(product);

    sendCreated(res, savedProduct);
  } catch (error) {
    next(error);
  }
});

// PUT /api/products/:id - Update product
app.put('/api/products/:id', async (req, res, next) => {
  try {
    const productRepo = AppDataSource.getRepository(Product);
    const productId = parseInt(req.params.id);
    const updateData = req.body;

    const product = await productRepo.findOne({ where: { id: productId } });
    if (!product) {
      return sendNotFound(res, 'Product');
    }

    Object.assign(product, updateData);
    const updatedProduct = await productRepo.save(product);

    sendSuccess(res, updatedProduct);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/products/:id - Delete product
app.delete('/api/products/:id', async (req, res, next) => {
  try {
    const productRepo = AppDataSource.getRepository(Product);
    const productId = parseInt(req.params.id);

    const result = await productRepo.delete(productId);
    if (result.affected === 0) {
      return sendNotFound(res, 'Product');
    }

    sendNoContent(res);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ORDER ENDPOINTS
// ============================================================================

// GET /api/orders - Get all orders
app.get('/api/orders', async (req, res, next) => {
  try {
    const orderRepo = AppDataSource.getRepository(Order);
    const orders = await orderRepo.find({
      relations: ['customer', 'items', 'items.product'],
    });
    sendSuccess(res, orders);
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/:id - Get order by ID
app.get('/api/orders/:id', async (req, res, next) => {
  try {
    const orderRepo = AppDataSource.getRepository(Order);
    const order = await orderRepo.findOne({
      where: { id: parseInt(req.params.id) },
      relations: ['customer', 'items', 'items.product'],
    });

    if (!order) {
      return sendNotFound(res, 'Order');
    }

    sendSuccess(res, order);
  } catch (error) {
    next(error);
  }
});

// POST /api/orders - Create new order
app.post('/api/orders', validateOrder, async (req, res, next) => {
  try {
    const orderRepo = AppDataSource.getRepository(Order);
    const customerRepo = AppDataSource.getRepository(Customer);
    const orderData: DeepPartial<Order> = req.body;

    // Verify customer exists
    const customer = await customerRepo.findOne({ where: { id: orderData.customerId } });
    if (!customer) {
      return sendValidationError(res, 'Customer not found');
    }

    const order = orderRepo.create({
      ...orderData,
      customer,
    });
    const savedOrder = await orderRepo.save(order);

    sendCreated(res, savedOrder);
  } catch (error) {
    next(error);
  }
});

// PUT /api/orders/:id - Update order
app.put('/api/orders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderRepo = AppDataSource.getRepository(Order);
    const orderId = parseInt(req.params.id);
    const updateData = req.body;

    const order = await orderRepo.findOne({ where: { id: orderId } });
    if (!order) {
      return sendNotFound(res, 'Order');
    }

    Object.assign(order, updateData);
    const updatedOrder = await orderRepo.save(order);

    sendSuccess(res, updatedOrder);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/orders/:id - Delete order
app.delete('/api/orders/:id', async (req, res, next) => {
  try {
    const orderRepo = AppDataSource.getRepository(Order);
    const orderId = parseInt(req.params.id);

    const result = await orderRepo.delete(orderId);
    if (result.affected === 0) {
      return sendNotFound(res, 'Order');
    }

    sendNoContent(res);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ORDER ITEM ENDPOINTS
// ============================================================================

// GET /api/order-items - Get all order items
app.get('/api/order-items', async (req, res, next) => {
  try {
    const orderItemRepo = AppDataSource.getRepository(OrderItem);
    const orderItems = await orderItemRepo.find({
      relations: ['order', 'order.customer', 'product'],
    });
    sendSuccess(res, orderItems);
  } catch (error) {
    next(error);
  }
});

// GET /api/order-items/:id - Get order item by ID
app.get('/api/order-items/:id', async (req, res, next) => {
  try {
    const orderItemRepo = AppDataSource.getRepository(OrderItem);
    const orderItem = await orderItemRepo.findOne({
      where: { id: parseInt(req.params.id) },
      relations: ['order', 'order.customer', 'product'],
    });

    if (!orderItem) {
      return sendNotFound(res, 'Order item');
    }

    sendSuccess(res, orderItem);
  } catch (error) {
    next(error);
  }
});

// POST /api/order-items - Create new order item
app.post('/api/order-items', validateOrderItem, async (req, res, next) => {
  try {
    const orderItemRepo = AppDataSource.getRepository(OrderItem);
    const orderRepo = AppDataSource.getRepository(Order);
    const productRepo = AppDataSource.getRepository(Product);
    const orderItemData: DeepPartial<OrderItem> = req.body;

    // Verify order and product exist
    const order = await orderRepo.findOne({ where: { id: orderItemData.orderId } });
    const product = await productRepo.findOne({ where: { id: orderItemData.productId } });

    if (!order) {
      return sendValidationError(res, 'Order not found');
    }

    if (!product) {
      return sendValidationError(res, 'Product not found');
    }

    const orderItem = orderItemRepo.create({
      ...orderItemData,
      order,
      product,
    });
    const savedOrderItem = await orderItemRepo.save(orderItem);

    sendCreated(res, savedOrderItem);
  } catch (error) {
    next(error);
  }
});

// PUT /api/order-items/:id - Update order item
app.put('/api/order-items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderItemRepo = AppDataSource.getRepository(OrderItem);
    const orderItemId = parseInt(req.params.id);
    const updateData = req.body;

    const orderItem = await orderItemRepo.findOne({ where: { id: orderItemId } });
    if (!orderItem) {
      return sendNotFound(res, 'Order item');
    }

    Object.assign(orderItem, updateData);
    const updatedOrderItem = await orderItemRepo.save(orderItem);

    sendSuccess(res, updatedOrderItem);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/order-items/:id - Delete order item
app.delete('/api/order-items/:id', async (req, res, next) => {
  try {
    const orderItemRepo = AppDataSource.getRepository(OrderItem);
    const orderItemId = parseInt(req.params.id);

    const result = await orderItemRepo.delete(orderItemId);
    if (result.affected === 0) {
      return sendNotFound(res, 'Order item');
    }

    sendNoContent(res);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// SHARED ROUTES
// ============================================================================

// Use shared routes
app.use('/', createRootRoutes(APP_NAME, VERSION));
app.use('/', createHealthRoutes(APP_NAME, VERSION));
app.use('/utils', createUtilityRoutes());
// Add docs route with placeholder URL (will be updated with actual port)
app.use('/docs', createDocsRoutes(APP_NAME, VERSION, `http://localhost:${DEFAULT_PORT}`));

// ============================================================================
// SCALAR API REFERENCE
// ============================================================================

// Scalar API documentation
app.use(
  '/reference',
  apiReference({
    spec: {
      content: openApiSpec,
    },
    theme: 'purple',
    metaData: {
      title: 'TypeORM API Documentation',
      description: 'Interactive API documentation for the TypeORM OLTP example',
      ogDescription: 'Explore and test the TypeORM API endpoints',
    },
  })
);

// Error handling middleware (must be last)
app.use(errorHandler);
app.use(notFoundHandler);

// Initialize database and start server
async function startServer() {
  try {
    console.log('Initializing TypeORM...');

    // Check if database is already initialized
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('Data Source has been initialized!');
    } else {
      console.log('Data Source already initialized!');
    }

    // Start the idempotent server
    const port = await idempotentServer.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown is handled by the idempotent server
// Custom shutdown logic for database cleanup
process.on('SIGINT', async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('Database connection closed');
  }
});

process.on('SIGTERM', async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('Database connection closed');
  }
});

// Start the server
startServer();
