"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openApiSpec = void 0;
exports.openApiSpec = {
    openapi: '3.1.0',
    info: {
        title: 'TypeORM OLTP API',
        version: '1.0.0',
        description: 'A RESTful API for managing customers, products, orders, and order items using TypeORM',
        contact: {
            name: 'API Support',
        },
    },
    servers: [
        {
            url: 'http://localhost:3000',
            description: 'Development server',
        },
    ],
    tags: [
        { name: 'Customers', description: 'Customer management endpoints' },
        { name: 'Products', description: 'Product catalog endpoints' },
        { name: 'Orders', description: 'Order management endpoints' },
        { name: 'Order Items', description: 'Order item management endpoints' },
        { name: 'Health', description: 'Health check endpoints' },
    ],
    paths: {
        '/api/customers': {
            get: {
                tags: ['Customers'],
                summary: 'Get all customers',
                description: 'Retrieve a list of all customers with their orders',
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/Customer' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                tags: ['Customers'],
                summary: 'Create a new customer',
                description: 'Create a new customer record',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/CustomerInput' },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Customer created successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/Customer' },
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Validation error',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/api/customers/{id}': {
            get: {
                tags: ['Customers'],
                summary: 'Get customer by ID',
                description: 'Retrieve a specific customer with their orders and order items',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'Customer ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/Customer' },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Customer not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
            put: {
                tags: ['Customers'],
                summary: 'Update customer',
                description: 'Update an existing customer',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'Customer ID',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/CustomerInput' },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Customer updated successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/Customer' },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Customer not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
            delete: {
                tags: ['Customers'],
                summary: 'Delete customer',
                description: 'Delete a customer by ID',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'Customer ID',
                    },
                ],
                responses: {
                    '204': {
                        description: 'Customer deleted successfully',
                    },
                    '404': {
                        description: 'Customer not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/api/products': {
            get: {
                tags: ['Products'],
                summary: 'Get all products',
                description: 'Retrieve a list of all products',
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/Product' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                tags: ['Products'],
                summary: 'Create a new product',
                description: 'Create a new product record',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ProductInput' },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Product created successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/Product' },
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Validation error',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/api/products/{id}': {
            get: {
                tags: ['Products'],
                summary: 'Get product by ID',
                description: 'Retrieve a specific product',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'Product ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/Product' },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Product not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
            put: {
                tags: ['Products'],
                summary: 'Update product',
                description: 'Update an existing product',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'Product ID',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ProductInput' },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Product updated successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/Product' },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Product not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
            delete: {
                tags: ['Products'],
                summary: 'Delete product',
                description: 'Delete a product by ID',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'Product ID',
                    },
                ],
                responses: {
                    '204': {
                        description: 'Product deleted successfully',
                    },
                    '404': {
                        description: 'Product not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/api/orders': {
            get: {
                tags: ['Orders'],
                summary: 'Get all orders',
                description: 'Retrieve a list of all orders with customer and items',
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/Order' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                tags: ['Orders'],
                summary: 'Create a new order',
                description: 'Create a new order record',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/OrderInput' },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Order created successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/Order' },
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Validation error',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/api/orders/{id}': {
            get: {
                tags: ['Orders'],
                summary: 'Get order by ID',
                description: 'Retrieve a specific order',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'Order ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/Order' },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Order not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
            put: {
                tags: ['Orders'],
                summary: 'Update order',
                description: 'Update an existing order',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'Order ID',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/OrderInput' },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Order updated successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/Order' },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Order not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
            delete: {
                tags: ['Orders'],
                summary: 'Delete order',
                description: 'Delete an order by ID',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'Order ID',
                    },
                ],
                responses: {
                    '204': {
                        description: 'Order deleted successfully',
                    },
                    '404': {
                        description: 'Order not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/api/order-items': {
            get: {
                tags: ['Order Items'],
                summary: 'Get all order items',
                description: 'Retrieve a list of all order items',
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/OrderItem' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                tags: ['Order Items'],
                summary: 'Create a new order item',
                description: 'Create a new order item record',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/OrderItemInput' },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Order item created successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/OrderItem' },
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Validation error',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/api/order-items/{id}': {
            get: {
                tags: ['Order Items'],
                summary: 'Get order item by ID',
                description: 'Retrieve a specific order item',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'Order item ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/OrderItem' },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Order item not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
            put: {
                tags: ['Order Items'],
                summary: 'Update order item',
                description: 'Update an existing order item',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'Order item ID',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/OrderItemInput' },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Order item updated successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/OrderItem' },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Order item not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
            delete: {
                tags: ['Order Items'],
                summary: 'Delete order item',
                description: 'Delete an order item by ID',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'Order item ID',
                    },
                ],
                responses: {
                    '204': {
                        description: 'Order item deleted successfully',
                    },
                    '404': {
                        description: 'Order item not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                            },
                        },
                    },
                },
            },
        },
        '/health': {
            get: {
                tags: ['Health'],
                summary: 'Health check',
                description: 'Check if the API is running',
                responses: {
                    '200': {
                        description: 'API is healthy',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'ok' },
                                        timestamp: { type: 'string', format: 'date-time' },
                                        service: { type: 'string', example: 'TypeORM API Server' },
                                        version: { type: 'string', example: '1.0.0' },
                                    },
                                },
                            },
                        },
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
                    id: { type: 'integer', example: 1 },
                    email: { type: 'string', format: 'email', example: 'alice@example.com' },
                    name: { type: 'string', example: 'Alice Johnson' },
                    country: { type: 'string', example: 'USA' },
                    city: { type: 'string', example: 'New York' },
                    createdAt: { type: 'string', format: 'date-time' },
                    orders: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Order' },
                    },
                },
            },
            CustomerInput: {
                type: 'object',
                required: ['email', 'name', 'country', 'city'],
                properties: {
                    email: { type: 'string', format: 'email', example: 'alice@example.com' },
                    name: { type: 'string', example: 'Alice Johnson' },
                    country: { type: 'string', example: 'USA' },
                    city: { type: 'string', example: 'New York' },
                },
            },
            Product: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    name: { type: 'string', example: 'Laptop' },
                    category: { type: 'string', example: 'Electronics' },
                    price: { type: 'number', format: 'float', example: 999.99 },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },
            ProductInput: {
                type: 'object',
                required: ['name', 'category', 'price'],
                properties: {
                    name: { type: 'string', example: 'Laptop' },
                    category: { type: 'string', example: 'Electronics' },
                    price: { type: 'number', format: 'float', example: 999.99 },
                },
            },
            Order: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    customerId: { type: 'integer', example: 1 },
                    orderDate: { type: 'string', format: 'date-time' },
                    status: { type: 'string', example: 'completed' },
                    total: { type: 'number', format: 'float', example: 1299.98 },
                    customer: { $ref: '#/components/schemas/Customer' },
                    items: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/OrderItem' },
                    },
                },
            },
            OrderInput: {
                type: 'object',
                required: ['customerId', 'status', 'total'],
                properties: {
                    customerId: { type: 'integer', example: 1 },
                    status: { type: 'string', example: 'completed' },
                    total: { type: 'number', format: 'float', example: 1299.98 },
                },
            },
            OrderItem: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    orderId: { type: 'integer', example: 1 },
                    productId: { type: 'integer', example: 1 },
                    quantity: { type: 'integer', example: 2 },
                    price: { type: 'number', format: 'float', example: 999.99 },
                    order: { $ref: '#/components/schemas/Order' },
                    product: { $ref: '#/components/schemas/Product' },
                },
            },
            OrderItemInput: {
                type: 'object',
                required: ['orderId', 'productId', 'quantity', 'price'],
                properties: {
                    orderId: { type: 'integer', example: 1 },
                    productId: { type: 'integer', example: 1 },
                    quantity: { type: 'integer', example: 2 },
                    price: { type: 'number', format: 'float', example: 999.99 },
                },
            },
            Error: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    error: {
                        type: 'object',
                        properties: {
                            message: { type: 'string', example: 'Resource not found' },
                            code: { type: 'string', example: 'NOT_FOUND' },
                        },
                    },
                },
            },
        },
    },
};
//# sourceMappingURL=openapi.js.map