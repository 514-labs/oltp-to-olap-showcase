# Environment Variable Setup Guide

This guide shows you how to properly configure and test environment variables for the TypeORM example.

## Quick Start

### 1. Create Your .env File

```bash
# Copy the example file
cp .env.example .env

# Edit it with your values
nano .env  # or code .env, vim .env, etc.
```

### 2. Verify Environment Variables Are Loaded

The `start-oltp.sh` script now explicitly loads and displays your configuration:

```bash
./start-oltp.sh
```

**Expected Output:**
```
📝 Loading environment variables from .env...
════════════════════════════════════════════════════════════
  Starting OLTP Application (TypeORM + PostgreSQL)
════════════════════════════════════════════════════════════

🔧 Configuration:
   • Container: typeorm-oltp-postgres
   • Port: 5433
   • Database: typeorm_db

📦 Step 1: Starting PostgreSQL...
```

If you see `⚠️ No .env file found`, the script will use default values.

## Testing Environment Variable Override

### Test 1: Change Database Name

Edit `.env`:
```bash
OLTP_POSTGRES_DB=my_custom_db
```

Run:
```bash
./start-oltp.sh
```

Verify:
```bash
docker exec typeorm-oltp-postgres psql -U postgres -l | grep my_custom_db
```

### Test 2: Change Container Name

Edit `.env`:
```bash
OLTP_POSTGRES_CONTAINER=my-custom-postgres
```

Run:
```bash
./start-oltp.sh
```

Verify:
```bash
docker ps | grep my-custom-postgres
```

### Test 3: Change Port

Edit `.env`:
```bash
OLTP_POSTGRES_PORT=5555
```

Run:
```bash
./start-oltp.sh
```

Verify:
```bash
docker ps | grep 5555
# You should see: 0.0.0.0:5555->5432/tcp
```

## Common Issues

### Issue: Changes Not Taking Effect

**Cause:** Docker containers already running with old values

**Solution:**
```bash
# Stop containers
docker compose -f ../../packages/shared/cdc/docker-compose.postgres.yaml \
               -f docker-compose.oltp.yaml down

# Remove volumes (this deletes data!)
docker volume rm typeorm_oltp_postgres_data

# Start fresh
./start-oltp.sh
```

### Issue: "No .env file found" Warning

**Cause:** Running script from wrong directory

**Solution:**
```bash
# Always run from the app directory
cd apps/typeorm-example
./start-oltp.sh

# NOT from root:
# cd /path/to/repo
# ./apps/typeorm-example/start-oltp.sh  # ❌ This won't find .env
```

### Issue: Variables Not Exported to Docker

**Cause:** Old version of start-oltp.sh script

**Solution:**
Make sure your script includes:
```bash
if [ -f "$ENV_FILE" ]; then
  echo "📝 Loading environment variables from .env..."
  set -a  # automatically export all variables
  source "$ENV_FILE"
  set +a
fi
```

And uses `--env-file` flag:
```bash
docker compose ... --env-file "$ENV_FILE" up -d
```

## How It Works

### Before (Broken)

```bash
# Old script
docker compose -f file1.yaml -f file2.yaml up -d
# Docker Compose looks for .env in current directory
# But script might be running from different directory
# Result: .env not found, defaults used
```

### After (Fixed)

```bash
# New script
ENV_FILE="$BASE_DIR/.env"

# 1. Load into shell environment
set -a
source "$ENV_FILE"
set +a

# 2. Pass explicitly to Docker Compose
docker compose ... --env-file "$ENV_FILE" up -d
```

**Key improvements:**
1. `source "$ENV_FILE"` loads variables into shell environment
2. `set -a` auto-exports all variables (makes them available to child processes)
3. `--env-file` explicitly tells Docker Compose where to find the file
4. Script shows loaded configuration before starting

## Environment Variable Priority

Docker Compose uses this priority (highest to lowest):

1. **Compose file** - Values hardcoded in YAML
2. **Environment variables** - Exported in shell (`export VAR=value`)
3. **`.env` file** - Loaded by Docker Compose or script
4. **Default values** - Fallback in YAML (`${VAR:-default}`)

Our script ensures .env values override defaults by:
- Loading them into shell environment (priority #2)
- Passing them explicitly to Docker Compose (priority #3)

## Advanced: Multiple Environment Files

### Development
```bash
cp .env.example .env.dev
# Edit .env.dev with dev settings

# Use it:
ln -sf .env.dev .env
./start-oltp.sh
```

### Production
```bash
cp .env.example .env.prod
# Edit .env.prod with prod settings

# Use it:
ln -sf .env.prod .env
./start-oltp.sh
```

### Testing
```bash
# Override specific values for testing
OLTP_POSTGRES_DB=test_db ./start-oltp.sh
```

## Verification Checklist

- [ ] `.env` file exists in app directory
- [ ] Script shows "📝 Loading environment variables from .env..."
- [ ] Configuration values match your .env file
- [ ] Docker containers use correct values
- [ ] Changes take effect after restart

## Next Steps

- See [README.md](README.md) for full setup guide
- See [.env.example](.env.example) for all available variables
- See [../../packages/shared/cdc/README.md](../../packages/shared/cdc/README.md) for CDC configuration
