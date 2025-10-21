# Prisma OLTP to OLAP Example

This package demonstrates transforming OLTP models to OLAP structures using Prisma.

## Features

- Schema-first development with `schema.prisma`
- Type-safe Prisma Client
- Relation queries with `include`
- SQLite for simplicity

## OLTP Schema

The schema models an e-commerce system:

```prisma
model Customer {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  country   String
  city      String
  createdAt DateTime @default(now())
  orders    Order[]
}

model Product {
  id          Int         @id @default(autoincrement())
  name        String
  category    String
  price       Float
  createdAt   DateTime    @default(now())
  orderItems  OrderItem[]
}

model Order {
  id         Int         @id @default(autoincrement())
  customerId Int
  customer   Customer    @relation(fields: [customerId], references: [id])
  orderDate  DateTime    @default(now())
  status     String
  total      Float
  items      OrderItem[]
}

model OrderItem {
  id        Int     @id @default(autoincrement())
  orderId   Int
  order     Order   @relation(fields: [orderId], references: [id])
  productId Int
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int
  price     Float
}
```

## Running the Example

1. Generate Prisma Client:
```bash
npm run prisma:generate
```

2. Run the example:
```bash
npm run dev
```

## What It Demonstrates

1. **OLTP Data Creation** - Seeds normalized data using Prisma Client
2. **Relation Queries** - Fetches related data with `include`
3. **Dimension Transformation** - Converts customers and products to dimensions
4. **Fact Transformation** - Creates sales facts from order items
5. **Aggregation** - Calculates totals by product and customer

## Key Prisma Features

- **Type Safety** - Full TypeScript types generated from schema
- **Relations** - Easy nested queries with automatic joins
- **Migrations** - Schema versioning with `prisma migrate`
- **Studio** - Visual database browser with `prisma studio`

## Output

The example produces:
- Customer and Product dimensions
- Sales facts with measures (quantity, price)
- Aggregated analytics (sales by product, sales by customer)
