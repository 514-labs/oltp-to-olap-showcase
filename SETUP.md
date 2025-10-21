# Setup Guide

This guide provides detailed instructions for setting up the OLTP to OLAP Showcase on your local machine.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running Examples](#running-examples)
- [Troubleshooting](#troubleshooting)
- [IDE Setup](#ide-setup)
- [Common Issues](#common-issues)

## Prerequisites

### Required Software

#### Node.js

**Recommended:** Node.js LTS (v20.x or v22.x)

The project supports Node.js >= 18.0.0, but some native dependencies (better-sqlite3, sqlite3) may have compatibility issues with newer versions like v23.x.

**Installation:**

Using nvm (recommended):
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js LTS
nvm install 20
nvm use 20

# Verify
node --version  # Should show v20.x.x
```

Using Homebrew (macOS):
```bash
brew install node@20
```

Direct download:
- Visit [nodejs.org](https://nodejs.org/)
- Download LTS version
- Follow installer instructions

#### pnpm

**Version:** >= 9.0.0

**Installation:**

Using npm:
```bash
npm install -g pnpm@latest
```

Using Homebrew (macOS):
```bash
brew install pnpm
```

Using standalone script:
```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

**Verify:**
```bash
pnpm --version  # Should show 9.x.x or higher
```

#### Git

**Version:** Any recent version

**Installation:**

macOS:
```bash
brew install git
```

Linux (Ubuntu/Debian):
```bash
sudo apt-get install git
```

Windows:
- Download from [git-scm.com](https://git-scm.com/)

### Optional Software

#### Python (for native module compilation)

Some native dependencies may require Python for building:

**Version:** 3.8 or higher

**Installation:**

macOS:
```bash
brew install python3
```

Linux:
```bash
sudo apt-get install python3
```

#### C++ Build Tools

Required for compiling native SQLite modules:

**macOS:**
```bash
xcode-select --install
```

**Linux:**
```bash
sudo apt-get install build-essential
```

**Windows:**
- Install Visual Studio Build Tools
- Or use windows-build-tools: `npm install -g windows-build-tools`

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/oltp-to-olap-showcase.git
cd oltp-to-olap-showcase
```

### 2. Install Dependencies

```bash
pnpm install
```

This will:
- Install all workspace dependencies
- Link local packages
- Download TypeScript and build tools

**Expected output:**
```
Scope: all 6 workspace projects
Packages: +354
...
Done in Xs
```

### 3. Build Shared Package

The shared utilities package must be built before running examples:

```bash
cd packages/shared
pnpm run build
```

**Expected output:**
```
> @oltp-olap/shared@1.0.0 build
> tsc

(no errors)
```

### 4. Verify Installation

Check that everything is set up correctly:

```bash
cd /path/to/oltp-to-olap-showcase
pnpm run build
```

This builds all packages. You should see successful compilation messages.

## Running Examples

### Prisma Example

The Prisma example is the most reliable as it has prebuilt binaries:

```bash
# Navigate to project root
cd /path/to/oltp-to-olap-showcase

# Generate Prisma Client
pnpm --filter @oltp-olap/prisma-example run prisma:generate

# Create database schema
cd apps/prisma-example
pnpm exec prisma db push

# Run the example
pnpm run dev
```

**Expected output:**
```
Seeding OLTP data...
OLTP data seeded successfully!

--- OLTP to OLAP Transformation ---

Step 1: Extracting OLTP data from Prisma...
Found 2 customers, 2 products, 3 order items

Step 2: Creating OLAP Dimensions...
[Dimension data displayed]

Step 3: Creating OLAP Facts...
[Fact data displayed]

Step 4: Performing OLAP Analytics...
Sales by Product:
  Laptop: 3 units, $2999.97 revenue
  ...
```

### Drizzle Example

```bash
cd /path/to/oltp-to-olap-showcase
pnpm --filter @oltp-olap/drizzle-example run dev
```

**Note:** May require native module compilation. See [Troubleshooting](#native-module-issues) if you encounter errors.

### TypeORM Example

```bash
cd /path/to/oltp-to-olap-showcase
pnpm --filter @oltp-olap/typeorm-example run dev
```

### Sequelize Example

```bash
cd /path/to/oltp-to-olap-showcase
pnpm --filter @oltp-olap/sequelize-example run dev
```

## Troubleshooting

### Native Module Issues

#### Problem: better-sqlite3 or sqlite3 fails to build

**Error message:**
```
Error: Could not locate the bindings file
```

**Solution 1: Use Node.js LTS**

Switch to Node.js v20 or v22:
```bash
nvm install 20
nvm use 20
pnpm install --force
```

**Solution 2: Rebuild native modules**

```bash
pnpm rebuild better-sqlite3 sqlite3
```

**Solution 3: Install build tools**

macOS:
```bash
xcode-select --install
```

Linux:
```bash
sudo apt-get install build-essential python3
```

### Workspace Issues

#### Problem: Package not found or import errors

**Error message:**
```
Cannot find module '@oltp-olap/shared'
```

**Solution:**

1. Ensure pnpm-workspace.yaml exists:
```bash
cat pnpm-workspace.yaml
# Should show:
# packages:
#   - 'packages/*'
```

2. Reinstall dependencies:
```bash
pnpm install
```

3. Build shared package:
```bash
cd packages/shared
pnpm run build
```

### TypeScript Compilation Errors

#### Problem: Type errors during build

**Solution:**

1. Ensure TypeScript is installed:
```bash
pnpm add -D typescript@latest -w
```

2. Clean build artifacts:
```bash
pnpm run clean
```

3. Rebuild:
```bash
pnpm run build
```

### Prisma Issues

#### Problem: Prisma Client not generated

**Error message:**
```
@prisma/client did not initialize yet
```

**Solution:**

```bash
cd apps/prisma-example
pnpm run prisma:generate
```

#### Problem: Database not in sync

**Error message:**
```
The table 'main.OrderItem' does not exist
```

**Solution:**

```bash
cd apps/prisma-example
pnpm exec prisma db push
```

### pnpm Issues

#### Problem: Scripts not allowed to run

**Error message:**
```
Ignored build scripts: @prisma/client, better-sqlite3...
```

**Solution:**

Create `.npmrc` in project root:
```bash
echo "scripts-prepend-node-path=true" > .npmrc
```

Then reinstall:
```bash
pnpm install
```

### Permission Errors

#### Problem: EACCES or permission denied

**Solution:**

On Unix systems:
```bash
sudo chown -R $USER ~/.pnpm-store
```

Or use nvm to avoid permission issues altogether.

## IDE Setup

### Visual Studio Code

#### Recommended Extensions

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Prisma** - Prisma schema support
- **TypeScript Vue Plugin** - Enhanced TypeScript support

Install via:
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension Prisma.prisma
```

#### Settings

Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

#### Tasks

Create `.vscode/tasks.json` for quick build tasks:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build All",
      "type": "shell",
      "command": "pnpm run build",
      "group": {
        "kind": "build",
        "isDefault": true
      }
    },
    {
      "label": "Run Prisma Example",
      "type": "shell",
      "command": "pnpm --filter @oltp-olap/prisma-example run dev"
    }
  ]
}
```

### WebStorm / IntelliJ IDEA

1. Open project directory
2. Enable TypeScript support: Settings → Languages & Frameworks → TypeScript
3. Set Node.js interpreter: Settings → Languages & Frameworks → Node.js
4. Enable Prettier: Settings → Languages & Frameworks → JavaScript → Prettier

### Vim / Neovim

Install coc.nvim and coc-tsserver:
```vim
:CocInstall coc-tsserver
```

Or use native LSP with typescript-language-server.

## Common Issues

### Issue: Slow Install Times

**Cause:** Large dependency tree

**Solutions:**
- Use pnpm's local registry cache
- Use `--frozen-lockfile` for CI/CD
- Enable pnpm's side effects cache

### Issue: Disk Space

**Cause:** Multiple node_modules in monorepo

**Solution:**

pnpm uses hard links and stores packages once:
```bash
# Check disk usage
du -sh node_modules

# Clean pnpm cache if needed
pnpm store prune
```

### Issue: Stale Build Artifacts

**Cause:** Outdated compiled files

**Solution:**

```bash
# Clean all build artifacts
pnpm run clean

# Rebuild everything
pnpm install
pnpm run build
```

### Issue: Port Already in Use

If running a dev server and port is occupied:

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

Or change port in package script.

## Environment Variables

### Optional Configuration

Create `.env` in project root for custom settings:

```bash
# Node environment
NODE_ENV=development

# Database paths (if you want custom locations)
PRISMA_DB_PATH=./custom/path/prisma.db
```

**Note:** The examples use in-memory or local SQLite databases, so environment variables are optional.

## Verification Checklist

After setup, verify everything works:

- [ ] `node --version` shows v18+
- [ ] `pnpm --version` shows v9+
- [ ] `pnpm install` completes without errors
- [ ] `pnpm run build` succeeds
- [ ] `pnpm --filter @oltp-olap/prisma-example run dev` runs successfully
- [ ] Output shows OLTP data, dimensions, facts, and analytics

## Getting Help

If you encounter issues not covered here:

1. Check [GitHub Issues](https://github.com/YOUR_USERNAME/oltp-to-olap-showcase/issues)
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for design details
3. See [CONTRIBUTING.md](./CONTRIBUTING.md) for development workflow
4. Open a new issue with:
   - Node.js version
   - pnpm version
   - Operating system
   - Error messages
   - Steps to reproduce

## Next Steps

After successful setup:

1. Explore the examples in `apps/*/src/`
2. Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the design
3. Try modifying transformation configurations
4. Add your own ORM example (see [CONTRIBUTING.md](./CONTRIBUTING.md))
5. Experiment with different aggregation strategies

Happy coding!
