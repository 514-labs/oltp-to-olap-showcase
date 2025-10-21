# Sequelize OLTP to OLAP Example

This package demonstrates transforming OLTP models to OLAP structures using Sequelize.

## Features

- Model-based ORM with associations
- Flexible configuration options
- Eager loading with `include`
- Raw queries and transaction support

## OLTP Schema

Models are defined using Sequelize's `Model.init()`:

```typescript
Customer.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'customers',
    timestamps: true,
  }
);
```

## Running the Example

```bash
npm run dev
```

## What It Demonstrates

1. **Model Definition** - Class-based models with DataTypes
2. **Associations** - `hasMany`, `belongsTo` relationships
3. **Eager Loading** - Include related data with `include`
4. **Raw Queries** - Get plain objects with `raw: true`
5. **OLAP Transformation** - Convert models to dimensional structures

## Key Sequelize Features

- **Mature Ecosystem** - Battle-tested in production
- **Hooks** - Lifecycle hooks for data manipulation
- **Transactions** - Full transaction support
- **Migrations** - Sequelize CLI for migrations
- **Multi-Database** - PostgreSQL, MySQL, SQLite, MSSQL support

## Output

The example produces:
- Customer and Product dimensions from Sequelize models
- Sales facts with aggregated measures
- Analytics by dimension using shared transformers
