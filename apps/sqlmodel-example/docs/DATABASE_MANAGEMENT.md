# Database Management Guide

## Why Auto-Initialize Was Removed

Previously, the API server would call `Base.metadata.create_all()` on **every startup/reload**. While this is safe (idempotent), it's inefficient because:

1. **Development Hot-Reload**: Every code change triggers a database check
2. **Production Overhead**: Unnecessary database queries on each deployment
3. **No Migration Tracking**: Can't safely evolve schema in production
4. **Hidden Behavior**: Makes database state management implicit

## New Approach

### Option 1: Manual Initialization (Recommended)

Use the dedicated script for explicit control:

```bash
# Check database connection
python init_db.py --check

# Initialize tables (first time setup)
python init_db.py

# Drop and recreate all tables (DESTRUCTIVE!)
python init_db.py --drop
```

**When to use:**

- First time project setup
- After adding new models
- Development/testing environments

### Option 2: Environment Variable (Development)

For development convenience, you can enable auto-initialization:

```bash
# Enable auto-init on startup
export AUTO_INIT_DB=true

# Run the server
fastapi dev src/main.py --port 3002
```

Or create a `.env` file:

```env
AUTO_INIT_DB=true
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/sqlalchemy_db
```

**When to use:**

- Local development with frequent schema changes
- CI/CD test environments
- Docker containers where fresh DB is created each time

### Option 3: Alembic Migrations (Production)

For production, use proper database migrations:

```bash
# Install Alembic
pip install alembic

# Initialize Alembic
alembic init alembic

# Generate migration from models
alembic revision --autogenerate -m "Initial migration"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

**When to use:**

- Production deployments
- Teams with multiple developers
- When you need rollback capability
- When schema changes need review

## Current Startup Behavior

The server now:

1. ✅ **Always** checks database connection health
2. ⚠️ **Optionally** creates tables (only if `AUTO_INIT_DB=true`)
3. 🚫 **Never** drops existing data

This gives you explicit control over database initialization.

## Comparison

| Method          | Speed   | Safety    | Tracking | Production Ready |
| --------------- | ------- | --------- | -------- | ---------------- |
| Auto-Init (old) | ❌ Slow | ✅ Safe   | ❌ No    | ❌ No            |
| Manual Script   | ✅ Fast | ⚠️ Manual | ❌ No    | ⚠️ Dev Only      |
| Alembic         | ✅ Fast | ✅ Safe   | ✅ Yes   | ✅ Yes           |

## Quick Reference

```bash
# Development: Manual init
python init_db.py

# Development: Auto-init on reload
AUTO_INIT_DB=true fastapi dev src/main.py --port 3002

# Production: Use Alembic + FastAPI run
alembic upgrade head
fastapi run src/main.py --port 3002

# Docker: Set environment variable
docker run -e AUTO_INIT_DB=true your-app
```

## Best Practices

### Development

1. Run `python init_db.py` once when starting work
2. Only use `AUTO_INIT_DB=true` if schema changes frequently
3. Commit schema changes with code changes

### Staging

1. Use Alembic migrations
2. Test migrations on copy of production data
3. Document migration steps

### Production

1. **Always** use Alembic migrations
2. **Never** enable `AUTO_INIT_DB`
3. Review migrations before applying
4. Keep migration scripts in version control
5. Have rollback plan ready

## Troubleshooting

### Server won't start: "Database connection failed"

```bash
# Check if database is running
psql $DATABASE_URL -c "SELECT 1"

# Verify connection string
echo $DATABASE_URL
```

### Tables not created

```bash
# Enable auto-init temporarily
AUTO_INIT_DB=true fastapi dev src/main.py --port 3002

# Or run manual init
python init_db.py
```

### Tables exist but schema is wrong

```bash
# Drop and recreate (loses data!)
python init_db.py --drop

# Or use Alembic for safe migration
alembic revision --autogenerate -m "Update schema"
alembic upgrade head
```

## Migration to Alembic (Future)

When ready to move to production-grade migrations:

1. Install Alembic
2. Initialize: `alembic init alembic`
3. Configure `alembic/env.py` to use your models
4. Generate initial migration: `alembic revision --autogenerate -m "Initial"`
5. Document the migration process for your team

See: https://alembic.sqlalchemy.org/en/latest/tutorial.html

---

**Summary**: Database initialization is now explicit and controlled, not automatic. This gives you better visibility and control over your database state.
