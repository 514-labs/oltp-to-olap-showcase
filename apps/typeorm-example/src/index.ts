import 'reflect-metadata';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { DataSource, DeepPartial } from 'typeorm';
import { apiReference } from '@scalar/express-api-reference';
import { Customer, Product, Order, OrderItem, CustomerAddress } from './entities';
import { openApiSpec } from './openapi';

/**
 * TypeORM API Server
 *
 * A simple Express.js API server with CRUD endpoints for each TypeORM model.
 */

// ============================================================================
// SIMPLE RESPONSE HELPERS
// ============================================================================

const sendSuccess = (res: Response, data: any) => {
  res.status(200).json({ success: true, data });
};

const sendCreated = (res: Response, data: any) => {
  res.status(201).json({ success: true, data });
};

const sendNoContent = (res: Response) => {
  res.status(204).send();
};

const sendNotFound = (res: Response, resource: string) => {
  res.status(404).json({ success: false, error: `${resource} not found` });
};

const sendValidationError = (res: Response, message: string) => {
  res.status(400).json({ success: false, error: message });
};

const sendError = (res: Response, message: string, status = 500) => {
  res.status(status).json({ success: false, error: message });
};

// ============================================================================
// DATABASE SETUP
// ============================================================================

// Initialize TypeORM DataSource (PostgreSQL with CDC support)
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'typeorm_db',
  synchronize: false, // Tables created by setup-db script
  logging: false,
  entities: [Customer, Product, Order, OrderItem, CustomerAddress],
});

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app = express();
const DEFAULT_PORT = parseInt(process.env.PORT || '3000', 10);

// Determine environment
const isDevelopment = process.env.NODE_ENV !== 'production';

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Helmet - Security headers (relaxed for Scalar in development)
const helmetConfig = isDevelopment
  ? {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://unpkg.com'],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://cdn.jsdelivr.net',
            'https://fonts.googleapis.com',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://cdn.jsdelivr.net'],
          workerSrc: ["'self'", 'blob:'],
        },
      },
    }
  : {};

app.use(helmet(helmetConfig));
app.use(cors());
app.use(express.json());

// Simple request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

const validateCustomer = (req: Request, res: Response, next: NextFunction) => {
  const { email, name, country, city } = req.body;
  if (!email || !name || !country || !city) {
    return sendValidationError(res, 'Email, name, country, and city are required');
  }
  next();
};

const validateProduct = (req: Request, res: Response, next: NextFunction) => {
  const { name, category, price } = req.body;
  if (!name || !category || price === undefined) {
    return sendValidationError(res, 'Name, category, and price are required');
  }
  next();
};

const validateOrder = (req: Request, res: Response, next: NextFunction) => {
  const { customerId, status, total } = req.body;
  if (!customerId || !status || total === undefined) {
    return sendValidationError(res, 'CustomerId, status, and total are required');
  }
  next();
};

const validateOrderItem = (req: Request, res: Response, next: NextFunction) => {
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
    const orderItemRepo = AppDataSource.getRepository(OrderItem);

    // Delete all order items for the order
    const orderItems = await orderItemRepo.delete({ orderId: parseInt(req.params.id) });
    if (orderItems.affected === 0) {
      return sendNotFound(res, 'Order items');
    }

    // Delete the order
    const result = await orderRepo.delete(parseInt(req.params.id));
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
// BASIC ROUTES
// ============================================================================

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'TypeORM API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      reference: '/reference',
      customers: '/api/customers',
      products: '/api/products',
      orders: '/api/orders',
      orderItems: '/api/order-items',
    },
  });
});

// Health check
app.get('/health', (req, res) => {
  const isDbConnected = AppDataSource.isInitialized;
  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? 'healthy' : 'unhealthy',
    database: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// SCALAR API REFERENCE (Development Only)
// ============================================================================

// Scalar API documentation - only in development
if (isDevelopment) {
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
  console.log('📚 Scalar API documentation available at /reference (development only)');
}

// ============================================================================
// ERROR HANDLING (must be last)
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.message);
  console.error(err.stack);

  res.status(500).json({
    success: false,
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack }),
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

let server: any;

async function startServer() {
  try {
    console.log('🔌 Connecting to PostgreSQL...');

    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Connected to PostgreSQL');
    } else {
      console.log('✅ Already connected to PostgreSQL');
    }

    // Verify tables exist (helpful error if setup-db wasn't run)
    const queryRunner = AppDataSource.createQueryRunner();
    try {
      const result = await queryRunner.query(
        "SELECT 1 FROM information_schema.tables WHERE table_name = 'customers' LIMIT 1"
      );
      if (result.length === 0) {
        console.error('\n❌ Database tables not found!');
        console.error('   Run this first: pnpm setup-db\n');
        process.exit(1);
      }
    } finally {
      await queryRunner.release();
    }

    // Start HTTP server
    server = app.listen(DEFAULT_PORT, () => {
      console.log(`\n🚀 TypeORM API Server running on http://localhost:${DEFAULT_PORT}`);
      console.log(`📚 API Documentation: http://localhost:${DEFAULT_PORT}/reference`);
      console.log(`💚 Health Check: http://localhost:${DEFAULT_PORT}/health\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('   Make sure to run: pnpm setup-db');
    process.exit(1);
  }
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

async function shutdown() {
  console.log('\n🛑 Shutting down gracefully...');

  // Close HTTP server
  if (server) {
    server.close(() => {
      console.log('✅ HTTP server closed');
    });
  }

  // Close database connection
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('✅ Database connection closed');
  }

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the server
startServer();
