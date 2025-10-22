# Documentation Index

Welcome to the OLTP to OLAP Showcase documentation. This page provides an overview of all available documentation and guides you to the right resources.

## Quick Links

| Document | Purpose | Audience |
|----------|---------|----------|
| [README.md](./README.md) | Project overview and quick start | Everyone |
| [SETUP.md](./SETUP.md) | Installation and setup instructions | New users |
| [API.md](./API.md) | Complete API reference | Developers |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Design decisions and architecture | Contributors, architects |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute | Contributors |

## Getting Started

### For New Users

1. **Start here:** [README.md](./README.md) - Get an overview of the project
2. **Then read:** [SETUP.md](./SETUP.md) - Install and run your first example
3. **Try it:** Run the Prisma example to see OLTP to OLAP transformation in action

### For Developers

1. **API Reference:** [API.md](./API.md) - Learn how to use `@oltp-olap/shared`
2. **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md) - Understand the design
3. **Examples:** Explore `apps/*/src/` for ORM-specific implementations

### For Contributors

1. **Contributing Guide:** [CONTRIBUTING.md](./CONTRIBUTING.md) - Learn the workflow
2. **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md) - Understand the codebase
3. **Setup:** [SETUP.md](./SETUP.md) - Set up your development environment

## Documentation by Topic

### Installation & Setup

- [SETUP.md](./SETUP.md) - Complete setup guide
  - Prerequisites (Node.js, pnpm)
  - Installation steps
  - Running examples
  - Troubleshooting common issues
  - IDE configuration

### Usage & API

- [API.md](./API.md) - API reference
  - Type definitions
  - OLAPTransformer methods
  - Usage examples
  - Best practices

- [README.md](./README.md) - Quick start
  - Running examples
  - Basic concepts
  - Use cases

### Architecture & Design

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture documentation
  - Design principles
  - Layer architecture
  - Data flow
  - Type system
  - Extension points
  - Performance considerations

### Contributing

- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guide
  - Development workflow
  - Adding new ORM examples
  - Code style guidelines
  - Testing strategy
  - Pull request process

### Package-Specific Documentation

**Packages:**
- [packages/shared/README.md](./packages/shared/README.md) - Shared utilities

**Apps:**
- [apps/prisma-example/README.md](./apps/prisma-example/README.md) - Prisma implementation
- [apps/drizzle-example/README.md](./apps/drizzle-example/README.md) - Drizzle implementation
- [apps/typeorm-example/README.md](./apps/typeorm-example/README.md) - TypeORM implementation
- [apps/sequelize-example/README.md](./apps/sequelize-example/README.md) - Sequelize implementation

## Concepts Explained

### OLTP vs OLAP

**OLTP (Online Transaction Processing):**
- Normalized schema (3NF)
- Optimized for writes and transactional integrity
- Many small, fast queries
- Example: Order processing system

**OLAP (Online Analytical Processing):**
- Denormalized schema (star/snowflake)
- Optimized for reads and complex analytics
- Fewer, larger aggregate queries
- Example: Business intelligence dashboard

See [README.md](./README.md#oltp-vs-olap) for more details.

### Star Schema

A star schema consists of:

1. **Fact Tables** - Measurable events (sales, inventory)
   - Numeric measures (quantity, revenue)
   - Foreign keys to dimensions
   - Timestamp for temporal analysis

2. **Dimension Tables** - Descriptive context (customer, product)
   - Attributes (name, category, location)
   - Slowly changing or static data

See [ARCHITECTURE.md](./ARCHITECTURE.md#star-schema-pattern) for more details.

### Transformation Process

The transformation follows these steps:

1. **Extract** - Query OLTP data from normalized tables
2. **Transform Dimensions** - Convert descriptive tables to dimensions
3. **Transform Facts** - Convert transactional data to fact records
4. **Aggregate** - Perform analytical calculations

See [ARCHITECTURE.md](./ARCHITECTURE.md#data-flow) for the complete flow.

## Code Examples

### Basic Transformation

```typescript
import { OLAPTransformer } from '@oltp-olap/shared';

// Transform to dimension
const customers = await orm.customers.findAll();
const customerDim = OLAPTransformer.transformToDimension(customers, config);

// Transform to facts
const orders = await orm.orders.findAll();
const salesFacts = OLAPTransformer.transformToFact(orders, factConfig);

// Aggregate
const salesByCustomer = OLAPTransformer.aggregateFacts(salesFacts, 'customer', 'sum');
```

See [API.md](./API.md#usage-examples) for more examples.

## Common Tasks

### Running an Example

```bash
# Prisma example
pnpm --filter @oltp-olap/prisma-example run prisma:generate
pnpm --filter @oltp-olap/prisma-example run dev

# Other examples
pnpm --filter @oltp-olap/drizzle-example run dev
pnpm --filter @oltp-olap/typeorm-example run dev
pnpm --filter @oltp-olap/sequelize-example run dev
```

See [SETUP.md](./SETUP.md#running-examples) for details.

### Adding a New ORM Example

1. Create package structure
2. Define schema using ORM syntax
3. Implement transformation logic
4. Create package README

See [CONTRIBUTING.md](./CONTRIBUTING.md#adding-a-new-orm-example) for step-by-step guide.

### Extending Shared Package

1. Define new types in `types.ts`
2. Implement methods in `transformers.ts`
3. Export from `index.ts`
4. Rebuild and update examples

See [CONTRIBUTING.md](./CONTRIBUTING.md#improving-shared-utilities) for details.

## Troubleshooting

### Common Issues

- **Native module errors** - See [SETUP.md](./SETUP.md#native-module-issues)
- **Workspace linking issues** - See [SETUP.md](./SETUP.md#workspace-issues)
- **TypeScript errors** - See [SETUP.md](./SETUP.md#typescript-compilation-errors)
- **Prisma client issues** - See [SETUP.md](./SETUP.md#prisma-issues)

### Getting Help

1. Check [SETUP.md](./SETUP.md#troubleshooting) troubleshooting section
2. Search existing GitHub issues
3. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for design context
4. Open a new issue with details

## Learning Path

### Beginner

1. Read [README.md](./README.md) for project overview
2. Follow [SETUP.md](./SETUP.md) to install and run Prisma example
3. Explore `apps/prisma-example/src/index.ts` to see transformation in action
4. Review [API.md](./API.md) to understand the shared API

### Intermediate

1. Study [ARCHITECTURE.md](./ARCHITECTURE.md) to understand design decisions
2. Compare different ORM implementations in `apps/*/src/`
3. Modify configurations to add new dimensions or measures
4. Try implementing custom aggregation logic

### Advanced

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md) to learn development workflow
2. Add a new ORM example (MikroORM, Kysely, etc.)
3. Extend shared package with new transformation types
4. Contribute improvements via pull requests

## External Resources

### OLAP Concepts

- [Kimball Dimensional Modeling](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/)
- [Star Schema on Wikipedia](https://en.wikipedia.org/wiki/Star_schema)
- [OLAP vs OLTP (AWS)](https://aws.amazon.com/compare/the-difference-between-olap-and-oltp/)

### ORMs

- [Prisma Documentation](https://www.prisma.io/docs)
- [Drizzle ORM](https://orm.drizzle.team/)
- [TypeORM](https://typeorm.io/)
- [Sequelize](https://sequelize.org/)

### TypeScript

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

### Monorepo Tools

- [pnpm Workspaces](https://pnpm.io/workspaces)
- [pnpm CLI](https://pnpm.io/cli/run)

## Feedback

We welcome feedback on our documentation:

- Found a typo? Open a PR
- Documentation unclear? Open an issue
- Missing information? Let us know

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to contribute.

## Version History

- **v1.0.0** - Initial release with comprehensive documentation
  - SETUP.md - Complete setup guide
  - API.md - Full API reference
  - ARCHITECTURE.md - Design documentation
  - CONTRIBUTING.md - Contribution guide

---

**Last Updated:** 2025-10-20
