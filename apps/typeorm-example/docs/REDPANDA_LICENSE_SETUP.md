# Redpanda Enterprise License Setup

The `postgres_cdc` input in Redpanda Connect requires a **Redpanda Enterprise Edition license**.

## Quick Setup

### Option 1: Environment Variable (Recommended)

Create a `.env` file in the `apps/typeorm-example/` directory:

```bash
# .env
REDPANDA_LICENSE=your_license_key_here
```

Then restart Moose:

```bash
moose dev
```

### Option 2: Export in Shell

```bash
export REDPANDA_LICENSE="your_license_key_here"
moose dev
```

### Option 3: Pass Inline

```bash
REDPANDA_LICENSE="your_license_key_here" moose dev
```

## Getting a License

### Free 30-Day Trial

Visit: https://redpanda.com/try-enterprise

Fill out the form to get a trial license key.

### Enterprise License

If you already have an enterprise license, use your existing key.

## Verifying License

After starting Moose with your license, check the logs:

```bash
docker logs typeorm-redpanda-connect
```

You should see:

```json
{"level":"info","msg":"Successfully loaded Redpanda license","license_type":"enterprise",...}
```

## Troubleshooting

### Error: "requires a valid Redpanda Enterprise Edition license"

```bash
# Check if license is set
echo $REDPANDA_LICENSE

# If empty, set it:
export REDPANDA_LICENSE="your_key_here"

# Restart
moose dev
```

### License Not Loading

```bash
# Stop everything
pkill -f "moose dev"

# Remove containers
docker rm -f typeorm-redpanda-connect

# Start with license
REDPANDA_LICENSE="your_key_here" moose dev
```

## Alternative: Using Debezium (Open Source)

If you don't have a Redpanda Enterprise license, you can use **Debezium** instead (open-source CDC):

See the git history for the Debezium configuration:

```bash
git log --all --full-history --oneline -- debezium-connector.json
```

## Environment Variables Template

Create `.env` file:

```bash
# PostgreSQL
DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=typeorm_db

# Redpanda Enterprise License (REQUIRED for postgres_cdc)
REDPANDA_LICENSE=your_license_key_here

# API Server
PORT=3000
NODE_ENV=development
```

## Resources

- [Redpanda Enterprise Trial](https://redpanda.com/try-enterprise)
- [Redpanda Connect Licensing](https://docs.redpanda.com/redpanda-connect/get-started/licensing/)
- [postgres_cdc Documentation](https://docs.redpanda.com/redpanda-connect/components/inputs/postgres_cdc/)
