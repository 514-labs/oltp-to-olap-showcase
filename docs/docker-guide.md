# Docker Setup Guide

Complete guide for Docker Compose configuration across all ORM examples.

## Overview

All projects use a consistent Docker setup for OLTP databases with CDC support:
- PostgreSQL 15 with logical replication
- Redpanda Connect for CDC streaming
- Project-specific ports and configurations

## Quick Setup

Each project includes an interactive setup script:

```bash
cd apps/{project-example}
./setup.sh              # Interactive mode (recommended)
make status             # Check what's running
```

## Project Configuration Matrix

| Project | Database | Port | Container Prefix |
|---------|----------|------|------------------|
| typeorm | `typeorm_db` | 5433 | `typeorm` |
| sqlmodel | `sqlmodel_db` | 5434 | `sqlmodel` |
| drizzle | `drizzle_db` | 5435 | `drizzle` |
| prisma | `prisma_db` | 5436 | `prisma` |
| sequelize | `sequelize_db` | 5437 | `sequelize` |

## Docker Files

Each project has:
- `docker-compose.oltp.yaml` - PostgreSQL database
- `docker-compose.dev.override.yaml` - CDC connector (used by moose dev)
- `redpanda-connect.yaml` - CDC configuration
- `setup.sh` - Interactive setup script

## Creating Templates for New Projects

When adding Docker setup to a new project:

### 1. Copy Template Files
```bash
cd apps/new-project
cp ../typeorm-example/docker-compose.oltp.yaml .
cp ../typeorm-example/docker-compose.dev.override.yaml .
cp ../typeorm-example/redpanda-connect.yaml .
cp ../typeorm-example/setup.sh .
chmod +x setup.sh
```

### 2. Update Configuration

**Find and Replace in all files:**
- Project name: `typeorm` → `newproject`
- Database name: `typeorm_db` → `newproject_db`
- Port: `5433` → `54XX` (pick unused port)

**Update table names in:**
- `setup.sh` - `TABLE_NAMES` array
- `redpanda-connect.yaml` - `tables` list

**Update DSN in `redpanda-connect.yaml`:**
```yaml
dsn: 'postgres://postgres:postgres@newproject-postgres:5432/newproject_db?sslmode=disable'
```

**Update Kafka topic:**
```yaml
topic: 'newproject_cdc_events'
```

### 3. Test
```bash
./setup.sh              # Run interactive setup
make status             # Verify everything is running
```

## Table Naming Conventions

Each ORM has different conventions:

- **TypeORM**: `customers`, `products`, `orders`, `order_items` (lowercase, underscores)
- **SQLModel**: `customer`, `product`, `order`, `orderitem` (lowercase, no underscores)
- **Drizzle**: `customers`, `products`, `orders`, `order_items` (lowercase, underscores)
- **Prisma**: `Customer`, `Product`, `Order`, `OrderItem` (PascalCase)
- **Sequelize**: `Customers`, `Products`, `Orders`, `OrderItems` (PascalCase, plural)

## Manual Operations

### Start Database Only
```bash
docker compose -f docker-compose.oltp.yaml up -d
```

### Start with CDC (via Moose)
```bash
# Start database first
docker compose -f docker-compose.oltp.yaml up -d

# Then start Moose (which starts the CDC connector)
moose dev
```

### Stop Services
```bash
docker compose -f docker-compose.oltp.yaml down
```

### Clean Up (Remove Volumes)
```bash
docker compose -f docker-compose.oltp.yaml down -v
```

## Troubleshooting

### Port Already in Use
**Error:** `bind: address already in use`

**Solution:** Change port in `docker-compose.oltp.yaml` or `setup.sh`

### CDC Not Capturing Changes
**Check:**
1. Tables exist: `./setup.sh status`
2. Publication configured: Check output of status
3. Replication slot active: Check output of status

### Connection Issues
**Check:**
1. PostgreSQL is running: `docker ps | grep postgres`
2. Port is correct: Check `docker compose` logs
3. Credentials match: Check `.env` files

## Related Documentation

- [Main README](../README.md)
- [Troubleshooting Guide](../TROUBLESHOOTING.md)
- [Test Client Configuration](./test-client/port-configuration.md)
