import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import { apiReference } from '@scalar/express-api-reference';
import { openApiSpec } from './openapi';

/**
 * Prisma API Server
 *
 * A simple Express.js API server with CRUD endpoints for each Prisma model.
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

// Initialize Prisma Client (PostgreSQL)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
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
    const customers = await prisma.customer.findMany({
      include: {
        orders: true,
      },
    });
    sendSuccess(res, customers);
  } catch (error) {
    next(error);
  }
});

// GET /api/customers/:id - Get customer by ID
app.get('/api/customers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        orders: {
          include: {
            items: true,
          },
        },
      },
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
      const { email, name, country, city } = req.body;

      const customer = await prisma.customer.create({
        data: {
          email,
          name,
          country,
          city,
        },
      });

      sendCreated(res, customer);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/customers/:id - Update customer
app.put('/api/customers/:id', async (req, res, next) => {
  try {
    const customerId = parseInt(req.params.id);
    const updateData = req.body;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return sendNotFound(res, 'Customer');
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: updateData,
    });

    sendSuccess(res, updatedCustomer);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/customers/:id - Delete customer
app.delete('/api/customers/:id', async (req, res, next) => {
  try {
    const customerId = parseInt(req.params.id);

    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return sendNotFound(res, 'Customer');
    }

    await prisma.customer.delete({
      where: { id: customerId },
    });

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
    const products = await prisma.product.findMany({
      include: {
        orderItems: true,
      },
    });
    sendSuccess(res, products);
  } catch (error) {
    next(error);
  }
});

// GET /api/products/:id - Get product by ID
app.get('/api/products/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        orderItems: {
          include: {
            order: true,
          },
        },
      },
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
    const { name, category, price } = req.body;

    const product = await prisma.product.create({
      data: {
        name,
        category,
        price,
      },
    });

    sendCreated(res, product);
  } catch (error) {
    next(error);
  }
});

// PUT /api/products/:id - Update product
app.put('/api/products/:id', async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id);
    const updateData = req.body;

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return sendNotFound(res, 'Product');
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    sendSuccess(res, updatedProduct);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/products/:id - Delete product
app.delete('/api/products/:id', async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id);

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return sendNotFound(res, 'Product');
    }

    await prisma.product.delete({
      where: { id: productId },
    });

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
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
    sendSuccess(res, orders);
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/:id - Get order by ID
app.get('/api/orders/:id', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
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
    const { customerId, status, total } = req.body;

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return sendValidationError(res, 'Customer not found');
    }

    const order = await prisma.order.create({
      data: {
        customerId,
        status,
        total,
      },
    });

    sendCreated(res, order);
  } catch (error) {
    next(error);
  }
});

// PUT /api/orders/:id - Update order
app.put('/api/orders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = parseInt(req.params.id);
    const updateData = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return sendNotFound(res, 'Order');
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    sendSuccess(res, updatedOrder);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/orders/:id - Delete order
app.delete('/api/orders/:id', async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id);

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return sendNotFound(res, 'Order');
    }

    // Delete all order items first (Prisma doesn't have cascade delete by default)
    await prisma.orderItem.deleteMany({
      where: { orderId },
    });

    // Delete the order
    await prisma.order.delete({
      where: { id: orderId },
    });

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
    const orderItems = await prisma.orderItem.findMany({
      include: {
        order: {
          include: {
            customer: true,
          },
        },
        product: true,
      },
    });
    sendSuccess(res, orderItems);
  } catch (error) {
    next(error);
  }
});

// GET /api/order-items/:id - Get order item by ID
app.get('/api/order-items/:id', async (req, res, next) => {
  try {
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
        product: true,
      },
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
    const { orderId, productId, quantity, price } = req.body;

    // Verify order and product exist
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!order) {
      return sendValidationError(res, 'Order not found');
    }

    if (!product) {
      return sendValidationError(res, 'Product not found');
    }

    const orderItem = await prisma.orderItem.create({
      data: {
        orderId,
        productId,
        quantity,
        price,
      },
    });

    sendCreated(res, orderItem);
  } catch (error) {
    next(error);
  }
});

// PUT /api/order-items/:id - Update order item
app.put('/api/order-items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderItemId = parseInt(req.params.id);
    const updateData = req.body;

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId }
    });

    if (!orderItem) {
      return sendNotFound(res, 'Order item');
    }

    const updatedOrderItem = await prisma.orderItem.update({
      where: { id: orderItemId },
      data: updateData,
    });

    sendSuccess(res, updatedOrderItem);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/order-items/:id - Delete order item
app.delete('/api/order-items/:id', async (req, res, next) => {
  try {
    const orderItemId = parseInt(req.params.id);

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId }
    });

    if (!orderItem) {
      return sendNotFound(res, 'Order item');
    }

    await prisma.orderItem.delete({
      where: { id: orderItemId },
    });

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
    name: 'Prisma API Server',
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
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
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
        title: 'Prisma API Documentation',
        description: 'Interactive API documentation for the Prisma OLTP example',
        ogDescription: 'Explore and test the Prisma API endpoints',
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

    // Test database connection
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL');

    // Verify tables exist (helpful error if migrations weren't run)
    try {
      await prisma.$queryRaw`SELECT 1 FROM "Customer" LIMIT 1`;
    } catch (error) {
      console.error('\n❌ Database tables not found!');
      console.error('   Run this first: pnpm prisma:push or pnpm prisma:migrate\n');
      process.exit(1);
    }

    // Start HTTP server
    server = app.listen(DEFAULT_PORT, () => {
      console.log(`\n🚀 Prisma API Server running on http://localhost:${DEFAULT_PORT}`);
      console.log(`📚 API Documentation: http://localhost:${DEFAULT_PORT}/reference`);
      console.log(`💚 Health Check: http://localhost:${DEFAULT_PORT}/health\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('   Make sure to run: pnpm prisma:push or pnpm prisma:migrate');
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
  await prisma.$disconnect();
  console.log('✅ Database connection closed');

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the server
startServer();
