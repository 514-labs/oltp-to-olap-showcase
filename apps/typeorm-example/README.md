# TypeORM API Server

A simple Express.js API server with CRUD endpoints for TypeORM entities, demonstrating proper TypeScript typing.

## Features

- **Full CRUD operations** for all models (Customer, Product, Order, OrderItem)
- **Type-safe endpoints** using TypeORM's native type inference
- **Input validation** with proper error handling
- **Relations support** - automatically loads related entities
- **SQLite database** with in-memory storage for easy testing
- **Express.js** with TypeScript for robust API development

## API Endpoints

### Customers

- `GET /api/customers` - Get all customers (with orders)
- `GET /api/customers/:id` - Get customer by ID (with orders and order items)
- `POST /api/customers` - Create new customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Products

- `GET /api/products` - Get all products (with order items)
- `GET /api/products/:id` - Get product by ID (with order items and orders)
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Orders

- `GET /api/orders` - Get all orders (with customer, items, and products)
- `GET /api/orders/:id` - Get order by ID (with full relations)
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

### Order Items

- `GET /api/order-items` - Get all order items (with order, customer, and product)
- `GET /api/order-items/:id` - Get order item by ID (with full relations)
- `POST /api/order-items` - Create new order item
- `PUT /api/order-items/:id` - Update order item
- `DELETE /api/order-items/:id` - Delete order item

### Utility Endpoints

- `GET /` - API documentation and available endpoints
- `GET /health` - Health check endpoint

## Installation & Setup

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Start the development server:**

   ```bash
   pnpm dev
   ```

3. **Build for production:**
   ```bash
   pnpm build
   pnpm start
   ```

## Usage Examples

### Create a Customer

```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "name": "John Doe",
    "country": "USA",
    "city": "San Francisco"
  }'
```

### Create a Product

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MacBook Pro",
    "category": "Electronics",
    "price": 1999.99
  }'
```

### Create an Order

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "status": "pending",
    "total": 1999.99
  }'
```

### Create an Order Item

```bash
curl -X POST http://localhost:3000/api/order-items \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": 1,
    "productId": 1,
    "quantity": 1,
    "price": 1999.99
  }'
```

### Get All Customers with Relations

```bash
curl http://localhost:3000/api/customers
```

### Get Customer by ID with Full Relations

```bash
curl http://localhost:3000/api/customers/1
```

## TypeScript Type Safety

The API demonstrates proper TypeORM type usage:

### Insert Types

```typescript
// Using DeepPartial for flexible inserts
const customerData: DeepPartial<Customer> = {
  email: 'test@example.com',
  name: 'Test User',
  country: 'USA',
  city: 'New York',
};
```

### Update Types

```typescript
// Using Omit to exclude auto-generated fields
type CustomerUpdate = Partial<Omit<Customer, 'id' | 'createdAt' | 'orders'>>;
const updateData: CustomerUpdate = {
  name: 'Updated Name',
  city: 'Updated City',
};
```

### Repository Operations

```typescript
// TypeORM automatically infers correct types
const customer = customerRepo.create(customerData);
const savedCustomer = await customerRepo.save(customer);
```

## Error Handling

The API includes comprehensive error handling:

- **Validation errors** (400) - Missing required fields
- **Not found errors** (404) - Entity doesn't exist
- **Server errors** (500) - Database or internal errors
- **Graceful shutdown** - Properly closes database connections

## Database Schema

The API uses TypeORM entities with the following relationships:

- **Customer** → **Order** (One-to-Many)
- **Order** → **OrderItem** (One-to-Many)
- **Product** → **OrderItem** (One-to-Many)

All entities include:

- Auto-generated IDs
- Created timestamps
- Proper foreign key relationships
- TypeORM decorators for validation

## Development

The server runs on `http://localhost:3000` by default. The database is in-memory SQLite, so data resets on each restart.

For production deployment, you would typically:

1. Use a persistent database (PostgreSQL, MySQL, etc.)
2. Add authentication/authorization
3. Add rate limiting
4. Add logging and monitoring
5. Use environment variables for configuration

## API Response Format

All responses follow a consistent format:

### Success Response

```json
{
  "id": 1,
  "email": "john@example.com",
  "name": "John Doe",
  "country": "USA",
  "city": "San Francisco",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "orders": []
}
```

### Error Response

```json
{
  "error": "Validation Error",
  "message": "Email, name, country, and city are required"
}
```

This API server demonstrates best practices for building TypeORM-based APIs with full TypeScript type safety!
