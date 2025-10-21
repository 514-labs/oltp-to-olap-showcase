# Drizzle ORM OLTP to OLAP Example

This package demonstrates transforming OLTP models to OLAP structures using Drizzle ORM.

## Features

- Type-safe SQL-like queries
- Schema defined in TypeScript
- Lightweight and performant
- Relational query API

## OLTP Schema

The schema is defined using Drizzle's table definitions:

```typescript
export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  country: text('country').notNull(),
  city: text('city').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category').notNull(),
  price: real('price').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});
```

## Running the Example

```bash
npm run dev
```

## What It Demonstrates

1. **Schema Definition** - TypeScript-first schema with full type inference
2. **Relations** - Define relationships using `relations()` helper
3. **Relational Queries** - Use `query` API for eager loading
4. **Type Safety** - Column-level type inference
5. **OLAP Transformation** - Convert to dimensions and facts

## Key Drizzle Features

- **Zero Dependencies** - Minimal runtime overhead
- **SQL-like Syntax** - Familiar query builder
- **Type Inference** - Infers types from schema without codegen
- **Multiple Dialects** - PostgreSQL, MySQL, SQLite support

## Output

The example produces:
- Customer and Product dimensions with full type safety
- Sales facts from order items
- Aggregated metrics using shared transformers
