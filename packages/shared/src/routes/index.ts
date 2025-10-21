import { Router, Request, Response } from 'express';
import { ApiResponse, HealthCheck, ApiDocumentation, OpenApiSpec, HttpStatusCode } from '../types';

/**
 * Shared Routes for OLTP to OLAP Demo Applications
 *
 * These routes are completely decoupled from any specific ORM
 * and provide common functionality across all demo applications.
 */

// ============================================================================
// HEALTH CHECK ROUTES
// ============================================================================

export const createHealthRoutes = (appName: string, version: string): Router => {
  const router = Router();

  // Basic health check
  router.get('/health', (req: Request, res: Response) => {
    const healthCheck: HealthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version,
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: {
          status: 'up',
          lastCheck: new Date().toISOString(),
        },
        memory: {
          status: 'up',
          lastCheck: new Date().toISOString(),
          details: {
            used: process.memoryUsage(),
          },
        },
      },
    };

    res.json(healthCheck);
  });

  // Detailed health check
  router.get('/health/detailed', (req: Request, res: Response) => {
    const healthCheck: HealthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version,
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: {
          status: 'up',
          lastCheck: new Date().toISOString(),
        },
        memory: {
          status: 'up',
          lastCheck: new Date().toISOString(),
          details: {
            used: process.memoryUsage(),
            free: process.memoryUsage().heapUsed,
          },
        },
        cpu: {
          status: 'up',
          lastCheck: new Date().toISOString(),
          details: {
            loadAverage: process.platform === 'win32' ? null : require('os').loadavg(),
            cpuCount: require('os').cpus().length,
          },
        },
      },
    };

    res.json(healthCheck);
  });

  return router;
};

// ============================================================================
// DOCUMENTATION ROUTES
// ============================================================================

export const createDocsRoutes = (
  appName: string,
  version: string,
  baseUrl: string,
  routes: any[] = []
): Router => {
  const router = Router();

  // API Documentation
  router.get('/', (req: Request, res: Response) => {
    const documentation: ApiDocumentation = {
      title: appName,
      version,
      description: `API Documentation for ${appName}`,
      baseUrl,
      routes: [
        {
          prefix: '/api',
          endpoints: [
            {
              method: 'GET',
              path: '/customers',
              handler: async () => {},
              description: 'Get all customers',
              tags: ['customers'],
            },
            {
              method: 'GET',
              path: '/customers/:id',
              handler: async () => {},
              description: 'Get customer by ID',
              tags: ['customers'],
            },
            {
              method: 'POST',
              path: '/customers',
              handler: async () => {},
              description: 'Create new customer',
              tags: ['customers'],
            },
            {
              method: 'PUT',
              path: '/customers/:id',
              handler: async () => {},
              description: 'Update customer',
              tags: ['customers'],
            },
            {
              method: 'DELETE',
              path: '/customers/:id',
              handler: async () => {},
              description: 'Delete customer',
              tags: ['customers'],
            },
            {
              method: 'GET',
              path: '/products',
              handler: async () => {},
              description: 'Get all products',
              tags: ['products'],
            },
            {
              method: 'GET',
              path: '/products/:id',
              handler: async () => {},
              description: 'Get product by ID',
              tags: ['products'],
            },
            {
              method: 'POST',
              path: '/products',
              handler: async () => {},
              description: 'Create new product',
              tags: ['products'],
            },
            {
              method: 'PUT',
              path: '/products/:id',
              handler: async () => {},
              description: 'Update product',
              tags: ['products'],
            },
            {
              method: 'DELETE',
              path: '/products/:id',
              handler: async () => {},
              description: 'Delete product',
              tags: ['products'],
            },
            {
              method: 'GET',
              path: '/orders',
              handler: async () => {},
              description: 'Get all orders',
              tags: ['orders'],
            },
            {
              method: 'GET',
              path: '/orders/:id',
              handler: async () => {},
              description: 'Get order by ID',
              tags: ['orders'],
            },
            {
              method: 'POST',
              path: '/orders',
              handler: async () => {},
              description: 'Create new order',
              tags: ['orders'],
            },
            {
              method: 'PUT',
              path: '/orders/:id',
              handler: async () => {},
              description: 'Update order',
              tags: ['orders'],
            },
            {
              method: 'DELETE',
              path: '/orders/:id',
              handler: async () => {},
              description: 'Delete order',
              tags: ['orders'],
            },
            {
              method: 'GET',
              path: '/order-items',
              handler: async () => {},
              description: 'Get all order items',
              tags: ['order-items'],
            },
            {
              method: 'GET',
              path: '/order-items/:id',
              handler: async () => {},
              description: 'Get order item by ID',
              tags: ['order-items'],
            },
            {
              method: 'POST',
              path: '/order-items',
              handler: async () => {},
              description: 'Create new order item',
              tags: ['order-items'],
            },
            {
              method: 'PUT',
              path: '/order-items/:id',
              handler: async () => {},
              description: 'Update order item',
              tags: ['order-items'],
            },
            {
              method: 'DELETE',
              path: '/order-items/:id',
              handler: async () => {},
              description: 'Delete order item',
              tags: ['order-items'],
            },
          ],
        },
      ],
      schemas: {
        Customer: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            country: { type: 'string' },
            city: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            category: { type: 'string' },
            price: { type: 'number', format: 'float' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            customerId: { type: 'number' },
            orderDate: { type: 'string', format: 'date-time' },
            status: { type: 'string' },
            total: { type: 'number', format: 'float' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        OrderItem: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            orderId: { type: 'number' },
            productId: { type: 'number' },
            quantity: { type: 'number' },
            price: { type: 'number', format: 'float' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    };

    res.json(documentation);
  });

  // OpenAPI Specification
  router.get('/openapi.json', (req: Request, res: Response) => {
    const openApiSpec: OpenApiSpec = {
      openapi: '3.0.0',
      info: {
        title: appName,
        version,
        description: `OpenAPI specification for ${appName}`,
      },
      servers: [
        {
          url: baseUrl,
          description: 'API Server',
        },
      ],
      paths: {
        '/api/customers': {
          get: {
            summary: 'Get all customers',
            description: 'Retrieve a list of all customers',
            tags: ['customers'],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Customer' },
                    },
                  },
                },
              },
            },
          },
          post: {
            summary: 'Create new customer',
            description: 'Create a new customer',
            tags: ['customers'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Customer' },
                },
              },
            },
            responses: {
              '201': {
                description: 'Customer created successfully',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Customer' },
                  },
                },
              },
            },
          },
        },
        '/api/customers/{id}': {
          get: {
            summary: 'Get customer by ID',
            description: 'Retrieve a specific customer by ID',
            tags: ['customers'],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'number' },
              },
            ],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Customer' },
                  },
                },
              },
              '404': {
                description: 'Customer not found',
              },
            },
          },
          put: {
            summary: 'Update customer',
            description: 'Update an existing customer',
            tags: ['customers'],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'number' },
              },
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Customer' },
                },
              },
            },
            responses: {
              '200': {
                description: 'Customer updated successfully',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Customer' },
                  },
                },
              },
              '404': {
                description: 'Customer not found',
              },
            },
          },
          delete: {
            summary: 'Delete customer',
            description: 'Delete a customer by ID',
            tags: ['customers'],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'number' },
              },
            ],
            responses: {
              '204': {
                description: 'Customer deleted successfully',
              },
              '404': {
                description: 'Customer not found',
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Customer: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              email: { type: 'string', format: 'email' },
              name: { type: 'string' },
              country: { type: 'string' },
              city: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          Product: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              category: { type: 'string' },
              price: { type: 'number', format: 'float' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          Order: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              customerId: { type: 'number' },
              orderDate: { type: 'string', format: 'date-time' },
              status: { type: 'string' },
              total: { type: 'number', format: 'float' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          OrderItem: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              orderId: { type: 'number' },
              productId: { type: 'number' },
              quantity: { type: 'number' },
              price: { type: 'number', format: 'float' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    };

    res.json(openApiSpec);
  });

  return router;
};

// ============================================================================
// ROOT ROUTES
// ============================================================================

export const createRootRoutes = (appName: string, version: string): Router => {
  const router = Router();

  // Root endpoint
  router.get('/', (req: Request, res: Response) => {
    const response: ApiResponse = {
      data: {
        name: appName,
        version,
        description: `OLTP to OLAP Demo - ${appName}`,
        endpoints: {
          health: '/health',
          docs: '/docs',
          api: '/api',
        },
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  // API root
  router.get('/api', (req: Request, res: Response) => {
    const response: ApiResponse = {
      data: {
        name: `${appName} API`,
        version,
        endpoints: {
          customers: '/api/customers',
          products: '/api/products',
          orders: '/api/orders',
          orderItems: '/api/order-items',
        },
        documentation: '/docs',
        health: '/health',
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  return router;
};

// ============================================================================
// UTILITY ROUTES
// ============================================================================

export const createUtilityRoutes = (): Router => {
  const router = Router();

  // Server info
  router.get('/info', (req: Request, res: Response) => {
    const response: ApiResponse = {
      data: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development',
        pid: process.pid,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  // Ping endpoint
  router.get('/ping', (req: Request, res: Response) => {
    res.json({ pong: true, timestamp: new Date().toISOString() });
  });

  return router;
};

// ============================================================================
// EXPORT ALL ROUTES
// ============================================================================
