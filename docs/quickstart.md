# Quick Start Guide

Get your OLTP-to-OLAP CDC pipeline running in minutes.

## Prerequisites

- Docker Desktop running
- Node.js 18+ or Python 3.10+
- Redpanda Enterprise License ([Get free trial](https://redpanda.com/try-enterprise))

## Choose Your Project

Pick the ORM that matches your stack:

| Technology | Project | Best For |
|------------|---------|----------|
| TypeScript | [typeorm-example](../apps/typeorm-example/) | Node.js developers |
| Python | [sqlmodel-example](../apps/sqlmodel-example/) | FastAPI/Python developers |
| TypeScript | [drizzle-example](../apps/drizzle-example/) | Modern TypeScript |
| TypeScript | [prisma-example](../apps/prisma-example/) | Prisma users |

## Setup (Any Project)

All projects use the same interactive setup system:

```bash
# 1. Navigate to project
cd apps/typeorm-example  # or any other project

# 2. Set Redpanda license
export REDPANDA_LICENSE="your_license_key_here"

# 3. Install project dependencies (pnpm install, pip install -e ., etc.)

# 4. Run interactive setup
./setup.sh

# The script will guide you through:
#  ✓ Starting PostgreSQL
#  ✓ Waiting for tables (with an optional prompt to run your migration command)
#  ✓ Configuring CDC
#  ✓ Verifying setup
```

## Next Steps

After setup completes:

### 1. Start Infrastructure
```bash
moose dev
```

### 2. Start Your Application
**TypeORM (TypeScript, recommended path):**
```bash
pnpm install   # If you haven't already
pnpm dev
```

**SQLModel (Python):**
```bash
python -m venv venv
source venv/bin/activate
pip install -e .   # If you haven't already
fastapi dev src/main.py --port 3002
```

**Other TypeScript experiments (Drizzle/Prisma):** follow the project-specific README under `apps/<project>-example/`.

### 3. Test the Pipeline
```bash
# Use test client
cd apps/test-client
pnpm install
pnpm dev
# Visit http://localhost:3001
```

## Understanding the Pipeline

```
Your API → PostgreSQL → CDC → Redpanda → Moose → ClickHouse
  (OLTP)      (WAL)            (Kafka)      (Transform)  (OLAP)
```

Every database change flows through this pipeline in <1 second.

## Common Commands

```bash
./setup.sh              # Interactive setup
./setup.sh status       # Check what's running
make status             # Same as above
make logs               # View all logs
make stop               # Stop services
make clean              # Remove everything
```

## Troubleshooting

**Setup Issues?**
- Check `./setup.sh status` for diagnostics
- Review [Troubleshooting Guide](../TROUBLESHOOTING.md)
- Ensure Docker is running
- Verify Redpanda license is set

**Still Stuck?**
Each project has detailed documentation:
- [TypeORM README](../apps/typeorm-example/README.md)
- [SQLModel README](../apps/sqlmodel-example/README.md)
- [Test Client README](../apps/test-client/README.md)

## Learn More

- [Docker Guide](./docker-guide.md) - Docker setup details
- [SQLModel CDC Architecture](../apps/sqlmodel-example/docs/CDC_TRANSFORMATION_ARCHITECTURE.md)
- [Contributing](../CONTRIBUTING.md) - How to contribute

---

**That's it!** You now have a working real-time CDC pipeline. Explore the project READMEs for detailed guides.
