# Prisma Example

A production-ready Express.js REST API using Prisma ORM for PostgreSQL.

## Features

- Schema-first development with `schema.prisma`
- Type-safe Prisma Client
- Relation queries with `include`
- PostgreSQL integration
- RESTful API with Express.js
- Interactive API documentation (Scalar)
- CDC pipeline ready with Moose and ClickHouse

## Quick Start

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Run database migrations:
```bash
pnpm prisma:push
# or for production
pnpm prisma:migrate
```

4. Generate Prisma Client:
```bash
pnpm prisma:generate
```

5. Start the development server:
```bash
pnpm dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

- `GET /` - API information
- `GET /health` - Health check
- `GET /reference` - Interactive API documentation (development only)
- `GET /api/customers` - List all customers
- `POST /api/customers` - Create a new customer
- `GET /api/customers/:id` - Get customer by ID
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer
- Similar endpoints for products, orders, and order items

## Database Schema

The schema includes:
- `Customer` - Customer information
- `Product` - Product catalog
- `Order` - Order records
- `OrderItem` - Order line items
- `CustomerAddress` - Customer addresses

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm prisma:generate` - Generate Prisma Client
- `pnpm prisma:push` - Push schema to database (development)
- `pnpm prisma:migrate` - Run migrations (production)

---

**Related Examples:**
- [TypeORM Example](../typeorm-example/README.md) - TypeScript/Node.js (Production Ready)
- [SQLModel Example](../sqlmodel-example/README.md) - Python/FastAPI (Production Ready)
