"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const typeorm_1 = require("typeorm");
const express_api_reference_1 = require("@scalar/express-api-reference");
const entities_1 = require("./entities");
const openapi_1 = require("./openapi");
const sendSuccess = (res, data) => {
    res.status(200).json({ success: true, data });
};
const sendCreated = (res, data) => {
    res.status(201).json({ success: true, data });
};
const sendNoContent = (res) => {
    res.status(204).send();
};
const sendNotFound = (res, resource) => {
    res.status(404).json({ success: false, error: `${resource} not found` });
};
const sendValidationError = (res, message) => {
    res.status(400).json({ success: false, error: message });
};
const sendError = (res, message, status = 500) => {
    res.status(status).json({ success: false, error: message });
};
const AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'typeorm_db',
    synchronize: false,
    logging: false,
    entities: [entities_1.Customer, entities_1.Product, entities_1.Order, entities_1.OrderItem, entities_1.CustomerAddress],
});
const app = (0, express_1.default)();
const DEFAULT_PORT = parseInt(process.env.PORT || '3000', 10);
const isDevelopment = process.env.NODE_ENV !== 'production';
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
app.use((0, helmet_1.default)(helmetConfig));
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});
const validateCustomer = (req, res, next) => {
    const { email, name, country, city } = req.body;
    if (!email || !name || !country || !city) {
        return sendValidationError(res, 'Email, name, country, and city are required');
    }
    next();
};
const validateProduct = (req, res, next) => {
    const { name, category, price } = req.body;
    if (!name || !category || price === undefined) {
        return sendValidationError(res, 'Name, category, and price are required');
    }
    next();
};
const validateOrder = (req, res, next) => {
    const { customerId, status, total } = req.body;
    if (!customerId || !status || total === undefined) {
        return sendValidationError(res, 'CustomerId, status, and total are required');
    }
    next();
};
const validateOrderItem = (req, res, next) => {
    const { orderId, productId, quantity, price } = req.body;
    if (!orderId || !productId || quantity === undefined || price === undefined) {
        return sendValidationError(res, 'OrderId, productId, quantity, and price are required');
    }
    next();
};
app.get('/api/customers', async (req, res, next) => {
    try {
        const customerRepo = AppDataSource.getRepository(entities_1.Customer);
        const customers = await customerRepo.find({
            relations: ['orders'],
        });
        sendSuccess(res, customers);
    }
    catch (error) {
        next(error);
    }
});
app.get('/api/customers/:id', async (req, res, next) => {
    try {
        const customerRepo = AppDataSource.getRepository(entities_1.Customer);
        const customer = await customerRepo.findOne({
            where: { id: parseInt(req.params.id) },
            relations: ['orders', 'orders.items'],
        });
        if (!customer) {
            return sendNotFound(res, 'Customer');
        }
        sendSuccess(res, customer);
    }
    catch (error) {
        next(error);
    }
});
app.post('/api/customers', validateCustomer, async (req, res, next) => {
    try {
        const customerRepo = AppDataSource.getRepository(entities_1.Customer);
        const customerData = req.body;
        const customer = customerRepo.create(customerData);
        const savedCustomer = await customerRepo.save(customer);
        sendCreated(res, savedCustomer);
    }
    catch (error) {
        next(error);
    }
});
app.put('/api/customers/:id', async (req, res, next) => {
    try {
        const customerRepo = AppDataSource.getRepository(entities_1.Customer);
        const customerId = parseInt(req.params.id);
        const updateData = req.body;
        const customer = await customerRepo.findOne({ where: { id: customerId } });
        if (!customer) {
            return sendNotFound(res, 'Customer');
        }
        Object.assign(customer, updateData);
        const updatedCustomer = await customerRepo.save(customer);
        sendSuccess(res, updatedCustomer);
    }
    catch (error) {
        next(error);
    }
});
app.delete('/api/customers/:id', async (req, res, next) => {
    try {
        const customerRepo = AppDataSource.getRepository(entities_1.Customer);
        const customerId = parseInt(req.params.id);
        const result = await customerRepo.delete(customerId);
        if (result.affected === 0) {
            return sendNotFound(res, 'Customer');
        }
        sendNoContent(res);
    }
    catch (error) {
        next(error);
    }
});
app.get('/api/products', async (req, res, next) => {
    try {
        const productRepo = AppDataSource.getRepository(entities_1.Product);
        const products = await productRepo.find({
            relations: ['orderItems'],
        });
        sendSuccess(res, products);
    }
    catch (error) {
        next(error);
    }
});
app.get('/api/products/:id', async (req, res, next) => {
    try {
        const productRepo = AppDataSource.getRepository(entities_1.Product);
        const product = await productRepo.findOne({
            where: { id: parseInt(req.params.id) },
            relations: ['orderItems', 'orderItems.order'],
        });
        if (!product) {
            return sendNotFound(res, 'Product');
        }
        sendSuccess(res, product);
    }
    catch (error) {
        next(error);
    }
});
app.post('/api/products', validateProduct, async (req, res, next) => {
    try {
        const productRepo = AppDataSource.getRepository(entities_1.Product);
        const productData = req.body;
        const product = productRepo.create(productData);
        const savedProduct = await productRepo.save(product);
        sendCreated(res, savedProduct);
    }
    catch (error) {
        next(error);
    }
});
app.put('/api/products/:id', async (req, res, next) => {
    try {
        const productRepo = AppDataSource.getRepository(entities_1.Product);
        const productId = parseInt(req.params.id);
        const updateData = req.body;
        const product = await productRepo.findOne({ where: { id: productId } });
        if (!product) {
            return sendNotFound(res, 'Product');
        }
        Object.assign(product, updateData);
        const updatedProduct = await productRepo.save(product);
        sendSuccess(res, updatedProduct);
    }
    catch (error) {
        next(error);
    }
});
app.delete('/api/products/:id', async (req, res, next) => {
    try {
        const productRepo = AppDataSource.getRepository(entities_1.Product);
        const productId = parseInt(req.params.id);
        const result = await productRepo.delete(productId);
        if (result.affected === 0) {
            return sendNotFound(res, 'Product');
        }
        sendNoContent(res);
    }
    catch (error) {
        next(error);
    }
});
app.get('/api/orders', async (req, res, next) => {
    try {
        const orderRepo = AppDataSource.getRepository(entities_1.Order);
        const orders = await orderRepo.find({
            relations: ['customer', 'items', 'items.product'],
        });
        sendSuccess(res, orders);
    }
    catch (error) {
        next(error);
    }
});
app.get('/api/orders/:id', async (req, res, next) => {
    try {
        const orderRepo = AppDataSource.getRepository(entities_1.Order);
        const order = await orderRepo.findOne({
            where: { id: parseInt(req.params.id) },
            relations: ['customer', 'items', 'items.product'],
        });
        if (!order) {
            return sendNotFound(res, 'Order');
        }
        sendSuccess(res, order);
    }
    catch (error) {
        next(error);
    }
});
app.post('/api/orders', validateOrder, async (req, res, next) => {
    try {
        const orderRepo = AppDataSource.getRepository(entities_1.Order);
        const customerRepo = AppDataSource.getRepository(entities_1.Customer);
        const orderData = req.body;
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
    }
    catch (error) {
        next(error);
    }
});
app.put('/api/orders/:id', async (req, res, next) => {
    try {
        const orderRepo = AppDataSource.getRepository(entities_1.Order);
        const orderId = parseInt(req.params.id);
        const updateData = req.body;
        const order = await orderRepo.findOne({ where: { id: orderId } });
        if (!order) {
            return sendNotFound(res, 'Order');
        }
        Object.assign(order, updateData);
        const updatedOrder = await orderRepo.save(order);
        sendSuccess(res, updatedOrder);
    }
    catch (error) {
        next(error);
    }
});
app.delete('/api/orders/:id', async (req, res, next) => {
    try {
        const orderRepo = AppDataSource.getRepository(entities_1.Order);
        const orderItemRepo = AppDataSource.getRepository(entities_1.OrderItem);
        const orderItems = await orderItemRepo.delete({ orderId: parseInt(req.params.id) });
        if (orderItems.affected === 0) {
            return sendNotFound(res, 'Order items');
        }
        const result = await orderRepo.delete(parseInt(req.params.id));
        if (result.affected === 0) {
            return sendNotFound(res, 'Order');
        }
        sendNoContent(res);
    }
    catch (error) {
        next(error);
    }
});
app.get('/api/order-items', async (req, res, next) => {
    try {
        const orderItemRepo = AppDataSource.getRepository(entities_1.OrderItem);
        const orderItems = await orderItemRepo.find({
            relations: ['order', 'order.customer', 'product'],
        });
        sendSuccess(res, orderItems);
    }
    catch (error) {
        next(error);
    }
});
app.get('/api/order-items/:id', async (req, res, next) => {
    try {
        const orderItemRepo = AppDataSource.getRepository(entities_1.OrderItem);
        const orderItem = await orderItemRepo.findOne({
            where: { id: parseInt(req.params.id) },
            relations: ['order', 'order.customer', 'product'],
        });
        if (!orderItem) {
            return sendNotFound(res, 'Order item');
        }
        sendSuccess(res, orderItem);
    }
    catch (error) {
        next(error);
    }
});
app.post('/api/order-items', validateOrderItem, async (req, res, next) => {
    try {
        const orderItemRepo = AppDataSource.getRepository(entities_1.OrderItem);
        const orderRepo = AppDataSource.getRepository(entities_1.Order);
        const productRepo = AppDataSource.getRepository(entities_1.Product);
        const orderItemData = req.body;
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
    }
    catch (error) {
        next(error);
    }
});
app.put('/api/order-items/:id', async (req, res, next) => {
    try {
        const orderItemRepo = AppDataSource.getRepository(entities_1.OrderItem);
        const orderItemId = parseInt(req.params.id);
        const updateData = req.body;
        const orderItem = await orderItemRepo.findOne({ where: { id: orderItemId } });
        if (!orderItem) {
            return sendNotFound(res, 'Order item');
        }
        Object.assign(orderItem, updateData);
        const updatedOrderItem = await orderItemRepo.save(orderItem);
        sendSuccess(res, updatedOrderItem);
    }
    catch (error) {
        next(error);
    }
});
app.delete('/api/order-items/:id', async (req, res, next) => {
    try {
        const orderItemRepo = AppDataSource.getRepository(entities_1.OrderItem);
        const orderItemId = parseInt(req.params.id);
        const result = await orderItemRepo.delete(orderItemId);
        if (result.affected === 0) {
            return sendNotFound(res, 'Order item');
        }
        sendNoContent(res);
    }
    catch (error) {
        next(error);
    }
});
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
app.get('/health', (req, res) => {
    const isDbConnected = AppDataSource.isInitialized;
    res.status(isDbConnected ? 200 : 503).json({
        status: isDbConnected ? 'healthy' : 'unhealthy',
        database: isDbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
    });
});
if (isDevelopment) {
    app.use('/reference', (0, express_api_reference_1.apiReference)({
        spec: {
            content: openapi_1.openApiSpec,
        },
        theme: 'purple',
        metaData: {
            title: 'TypeORM API Documentation',
            description: 'Interactive API documentation for the TypeORM OLTP example',
            ogDescription: 'Explore and test the TypeORM API endpoints',
        },
    }));
    console.log('📚 Scalar API documentation available at /reference (development only)');
}
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.path,
    });
});
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: isDevelopment ? err.message : 'Internal server error',
        ...(isDevelopment && { stack: err.stack }),
    });
});
let server;
async function startServer() {
    try {
        console.log('🔌 Connecting to PostgreSQL...');
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
            console.log('✅ Connected to PostgreSQL');
        }
        else {
            console.log('✅ Already connected to PostgreSQL');
        }
        const queryRunner = AppDataSource.createQueryRunner();
        try {
            const result = await queryRunner.query("SELECT 1 FROM information_schema.tables WHERE table_name = 'customers' LIMIT 1");
            if (result.length === 0) {
                console.error('\n❌ Database tables not found!');
                console.error('   Run this first: pnpm setup-db\n');
                process.exit(1);
            }
        }
        finally {
            await queryRunner.release();
        }
        server = app.listen(DEFAULT_PORT, () => {
            console.log(`\n🚀 TypeORM API Server running on http://localhost:${DEFAULT_PORT}`);
            console.log(`📚 API Documentation: http://localhost:${DEFAULT_PORT}/reference`);
            console.log(`💚 Health Check: http://localhost:${DEFAULT_PORT}/health\n`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        console.error('   Make sure to run: pnpm setup-db');
        process.exit(1);
    }
}
async function shutdown() {
    console.log('\n🛑 Shutting down gracefully...');
    if (server) {
        server.close(() => {
            console.log('✅ HTTP server closed');
        });
    }
    if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        console.log('✅ Database connection closed');
    }
    process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
startServer();
//# sourceMappingURL=index.js.map