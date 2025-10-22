# Test Client Setup

Simple React app for testing the TypeORM OLTP API and CDC pipeline.

## Features

- Generate random customers and products
- Create random orders with random items
- View, edit, and delete orders
- Test CDC pipeline by triggering CRUD operations

## Prerequisites

Make sure the OLTP API server is running:

```bash
cd /Users/oliviakane/oltp-to-olap-showcase/apps/typeorm-example
pnpm start-oltp
pnpm dev
```

The API should be accessible at http://localhost:3000

## Running the Test Client

```bash
cd /Users/oliviakane/oltp-to-olap-showcase/apps/test-client

# Run the development server
pnpm dev
```

The app will be available at http://localhost:3001

## Usage

1. **Generate Customers**: Click "Generate Random Customer" to create test customers
2. **Generate Products**: Click "Generate Random Product" to create test products
3. **Create Orders**: Once you have customers and products, click "Generate Random Order" to create orders with random items
4. **Edit Orders**: Click the edit button on any order to modify customer, status, or total
5. **Delete Orders**: Click the trash button to delete an order

Each CRUD operation will trigger CDC events that flow through:
- PostgreSQL WAL
- Redpanda Connect CDC connector
- Redpanda (Kafka)
- Moose streaming functions
- ClickHouse OLAP database

## Building for Production

```bash
pnpm build
```

The built files will be in the `dist/` directory.
