# Contributing Guide

Thank you for your interest in contributing to the OLTP to OLAP Showcase! This document provides guidelines for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Adding a New ORM Example](#adding-a-new-orm-example)
- [Improving Shared Utilities](#improving-shared-utilities)
- [Code Style](#code-style)
- [Testing](#testing)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project follows standard open-source community guidelines:
- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other contributors

## Getting Started

### Prerequisites

- Node.js >= 18.0.0 (recommend using v20 or v22 for better compatibility)
- pnpm >= 9.0.0
- Git

### Initial Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/oltp-to-olap-showcase.git
   cd oltp-to-olap-showcase
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Build all packages:
   ```bash
   pnpm run build
   ```

5. Run examples to verify:
   ```bash
   # Prisma example
   cd apps/prisma-example
   pnpm run prisma:generate
   pnpm run dev
   ```

## Development Workflow

### Branch Naming

- `feature/` - New features or examples
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `chore/` - Maintenance tasks

Example: `feature/add-kysely-example` or `docs/improve-setup-guide`

### Commit Messages

Follow conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting)
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance tasks

Examples:
```
feat(drizzle): add support for PostgreSQL
fix(shared): handle null values in transformToDimension
docs(readme): update installation instructions
```

### Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Build in watch mode (during development)
cd packages/shared && pnpm run build --watch

# Format code
pnpm run format

# Clean build artifacts
pnpm run clean

# Run specific package
pnpm --filter @oltp-olap/prisma-example run dev
```

## Project Structure

```
oltp-to-olap-showcase/
├── packages/
│   └── shared/              # Core transformation utilities
├── apps/
│   ├── prisma-example/      # Prisma ORM example
│   ├── drizzle-example/     # Drizzle ORM example
│   ├── typeorm-example/     # TypeORM example
│   └── sequelize-example/   # Sequelize example
├── ARCHITECTURE.md          # Architecture documentation
├── CONTRIBUTING.md          # This file
├── README.md               # Project overview
└── package.json            # Root package configuration
```

## Adding a New ORM Example

To add support for a new ORM:

### 1. Create App Structure

```bash
mkdir -p apps/new-orm-example/src
cd apps/new-orm-example
```

### 2. Create package.json

```json
{
  "name": "@oltp-olap/new-orm-example",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@oltp-olap/shared": "workspace:*",
    "your-orm": "^x.x.x"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
```

### 3. Create tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. Implement Schema

Create schema files using your ORM's syntax. Match the existing schema:
- Customer (id, email, name, country, city, createdAt)
- Product (id, name, category, price, createdAt)
- Order (id, customerId, orderDate, status, total)
- OrderItem (id, orderId, productId, quantity, price)

### 5. Implement Transformations

In `src/index.ts`:

```typescript
import { OLAPTransformer } from '@oltp-olap/shared';
import type { DimensionConfig, FactConfig } from '@oltp-olap/shared';

// Configuration
const customerDimensionConfig: DimensionConfig = { /* ... */ };
const productDimensionConfig: DimensionConfig = { /* ... */ };
const salesFactConfig: FactConfig = { /* ... */ };

// Functions
async function seedOLTPData() { /* ... */ }
async function transformToOLAP() { /* ... */ }
async function main() { /* ... */ }
```

### 6. Create README

Document ORM-specific features and usage. See existing examples for structure.

### 7. Test

Run your example to ensure it works:
```bash
pnpm run dev
```

### 8. Update Root README

Add your example to the list in the main README.md.

## Improving Shared Utilities

The `@oltp-olap/shared` package should remain ORM-agnostic.

### Adding New Transformation Methods

1. Define types in `src/types.ts`:
```typescript
export interface NewConfig {
  // configuration fields
}
```

2. Implement in `src/transformers.ts`:
```typescript
export class OLAPTransformer {
  static newTransformation(
    records: OLTPRecord[],
    config: NewConfig
  ): OutputType[] {
    // implementation
  }
}
```

3. Export from `src/index.ts`:
```typescript
export * from './types';
export * from './transformers';
```

4. Rebuild shared package:
```bash
cd packages/shared
pnpm run build
```

5. Update examples to use new functionality

### Guidelines for Shared Code

- No ORM-specific code
- Pure functions where possible
- Comprehensive TypeScript types
- JSDoc comments for public APIs
- Consider edge cases (null, undefined, empty arrays)

## Code Style

### TypeScript

- Use TypeScript strict mode
- Prefer interfaces over types for objects
- Use explicit return types for public functions
- Avoid `any` - use `unknown` if truly dynamic

### Formatting

- 2 spaces for indentation
- Single quotes for strings
- Trailing commas in multiline structures
- Max line length: 100 characters

Run formatter before committing:
```bash
pnpm run format
```

### Naming Conventions

- **PascalCase** - Classes, interfaces, types
- **camelCase** - Variables, functions, methods
- **UPPER_SNAKE_CASE** - Constants
- **kebab-case** - File names (except components)

### Comments

- Use JSDoc for public APIs
- Explain "why" not "what" in inline comments
- Keep comments up to date with code changes

Example:
```typescript
/**
 * Transforms OLTP records into OLAP dimension structures.
 *
 * @param records - Array of raw OLTP records
 * @param config - Configuration specifying which fields to extract
 * @returns Array of dimension objects with keys and attributes
 */
static transformToDimension(
  records: OLTPRecord[],
  config: DimensionConfig
): OLAPDimension[] {
  // Implementation
}
```

## Testing

Currently, the project uses runnable examples as demonstrations. To add formal tests:

### Unit Tests

For shared utilities:
```typescript
import { describe, test, expect } from 'vitest';
import { OLAPTransformer } from '../src';

describe('OLAPTransformer', () => {
  test('transformToDimension extracts specified attributes', () => {
    const records = [{ id: 1, name: 'Alice', age: 30 }];
    const config = {
      name: 'customer',
      sourceTable: 'Customer',
      keyField: 'id',
      attributes: ['name']
    };

    const result = OLAPTransformer.transformToDimension(records, config);

    expect(result).toHaveLength(1);
    expect(result[0].dimensionKey).toBe('1');
    expect(result[0].attributes).toEqual({ name: 'Alice' });
  });
});
```

### Integration Tests

For ORM examples, test the full flow:
1. Seed data
2. Extract via ORM
3. Transform to OLAP
4. Verify output structure

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @oltp-olap/shared test

# Run tests in watch mode
pnpm test --watch
```

## Documentation

### Code Documentation

- JSDoc comments for all public APIs
- Examples in JSDoc where helpful
- Document complex algorithms inline

### README Updates

- Update package README when adding features
- Keep examples current with code changes
- Update main README for new packages

### Architecture Documentation

When making architectural changes, update `ARCHITECTURE.md`:
- Design decisions and rationale
- Trade-offs considered
- Impacts on existing code

## Pull Request Process

### Before Submitting

1. Ensure code builds successfully:
   ```bash
   pnpm run build
   ```

2. Format code:
   ```bash
   pnpm run format
   ```

3. Test your changes thoroughly

4. Update documentation as needed

5. Write clear commit messages

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- Bullet point list of changes

## Testing
How was this tested?

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code builds without errors
- [ ] Code is formatted
- [ ] Documentation updated
- [ ] Tests added/updated (if applicable)
```

### Review Process

1. Submit PR from your fork
2. Maintainers will review
3. Address feedback and make changes
4. Once approved, PR will be merged

### After Merge

- Delete your feature branch
- Pull latest changes from main
- Start new branch for next contribution

## Questions or Issues?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Reach out to maintainers for guidance

## Recognition

Contributors will be recognized in:
- Project README (contributors section)
- Release notes for significant contributions

Thank you for contributing to OLTP to OLAP Showcase!
