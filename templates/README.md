# {{PROJECT_NAME}} - OLTP with CDC Setup

This project demonstrates an OLTP application with Change Data Capture (CDC) support.

## What is CDC?

Change Data Capture (CDC) is a pattern that tracks changes in your database and streams them to other systems in real-time. This enables:

- **Real-time analytics**: Update dashboards as data changes
- **Event-driven architectures**: Trigger actions based on data changes
- **Data synchronization**: Keep multiple systems in sync
- **Audit logs**: Track all changes to your data

## Architecture

```
┌─────────────────┐
│   Your App      │ ← Write operations
└────────┬────────┘
         │
         ↓
┌─────────────────────────┐
│   PostgreSQL            │
│   (OLTP Database)       │
│                         │
│   • Logical Replication │ ← Tracks all changes
│   • Publication         │ ← Defines what to track
│   • Replication Slot    │ ← Buffers changes
└───────────┬─────────────┘
            │
            ↓ Changes streamed
┌─────────────────────────┐
│   Redpanda Connect      │ ← CDC Connector
│   (Postgres → Kafka)    │
└───────────┬─────────────┘
            │
            ↓
┌─────────────────────────┐
│   Kafka Topic           │
│   {{PROJECT_NAME}}_cdc_events │
└─────────────────────────┘
```

## Quick Start

### Prerequisites

- Docker Desktop running
- Node.js 18+ (for running the app)
- (Optional) Redpanda License for CDC features

### Setup

```bash
# Interactive setup (recommended for first time)
./setup.sh

# Or run all steps automatically
./setup.sh all

# Or use Make
make start
```

The interactive setup will walk you through each step and explain what's happening.

### Manual Steps

If you prefer to run steps individually:

```bash
# 1. Start PostgreSQL
./setup.sh start-db

# 2. Start your application (creates tables)
npm run dev

# 3. Configure CDC
./setup.sh setup-cdc

# 4. Start CDC connector
./setup.sh start-connector

# 5. Verify everything
./setup.sh status
```

## Available Commands

### Using the setup script:

```bash
./setup.sh start-db        # Start PostgreSQL
./setup.sh setup-cdc       # Configure CDC
./setup.sh start-connector # Start Redpanda Connect
./setup.sh status          # Show status
./setup.sh logs-connector  # View connector logs
./setup.sh stop            # Stop everything
./setup.sh clean           # Remove containers
```

### Using Make (shorthand):

```bash
make start      # Interactive setup
make status     # Show status
make logs       # View all logs
make stop       # Stop services
make help       # Show all commands
```

## Monitoring

### Check Status

```bash
./setup.sh status
```

Shows the status of all components:
- PostgreSQL health
- Tables created
- CDC publication status
- Replication slot status
- Redpanda Connect status

### View Logs

```bash
# All logs
make logs

# Just PostgreSQL
make logs-db

# Just CDC connector
make logs-connector
```

### Check CDC Events

```bash
# View connector logs to see events being processed
docker logs {{PROJECT_NAME}}-redpanda-connect -f

# Connect to PostgreSQL and check replication slot
docker exec -it {{PROJECT_NAME}}-oltp-postgres psql -U postgres -d {{DB_NAME}}

# Check replication slot lag
SELECT * FROM pg_replication_slots;

# Check publication
SELECT * FROM pg_publication;
SELECT * FROM pg_publication_tables;
```

## Configuration

### Database

- **Port**: {{PORT}}
- **Database**: {{DB_NAME}}
- **User**: postgres
- **Password**: postgres

Connect with:
```bash
psql postgresql://postgres:postgres@localhost:{{PORT}}/{{DB_NAME}}
```

### CDC

- **Publication**: `redpanda_cdc_publication`
- **Replication Slot**: `redpanda_cdc_slot`
- **Tables**: See `config/create-publication.sql`
- **Kafka Topic**: `{{PROJECT_NAME}}_cdc_events`

### Redpanda Connect

- **Config**: `config/redpanda-connect.yaml`
- **HTTP API**: http://localhost:{{CONNECTOR_PORT}}

## Troubleshooting

### PostgreSQL won't start

```bash
# Check logs
make logs-db

# Check if port is already in use
lsof -i :{{PORT}}

# Restart
make restart
```

### Tables not found

Make sure your application has run and created the tables:

```bash
# Check tables
docker exec {{PROJECT_NAME}}-oltp-postgres \
  psql -U postgres -d {{DB_NAME}} -c "\dt"

# Run your app
npm run dev
```

### CDC not capturing changes

```bash
# Verify CDC is set up
./setup.sh verify

# Check replication slot is active
docker exec {{PROJECT_NAME}}-oltp-postgres \
  psql -U postgres -d {{DB_NAME}} -c \
  "SELECT * FROM pg_replication_slots WHERE slot_name='redpanda_cdc_slot';"

# Check connector logs
make logs-connector
```

### Redpanda Connect errors

```bash
# Check connector logs
make logs-connector

# Common issues:
# - REDPANDA_LICENSE not set (if using licensed features)
# - Cannot connect to Postgres (check network)
# - Replication slot doesn't exist (run setup-cdc)
```

## Development Workflow

### Making Schema Changes

When you add/remove/modify tables:

1. Update your application code
2. Run migrations or restart app
3. Update CDC publication:
   ```bash
   # Edit config/create-publication.sql
   # Then re-run CDC setup
   ./setup.sh setup-cdc
   ```
4. Restart connector:
   ```bash
   docker restart {{PROJECT_NAME}}-redpanda-connect
   ```

### Testing CDC

```bash
# 1. Make sure everything is running
./setup.sh status

# 2. Make a change in your database
# (via your app or directly in psql)

# 3. Watch the connector logs
make logs-connector

# 4. You should see change events being processed
```

### Resetting Everything

```bash
# Stop and remove everything
./setup.sh clean

# Start fresh
./setup.sh all
```

## Learn More

### About PostgreSQL Logical Replication

- [PostgreSQL Logical Replication Docs](https://www.postgresql.org/docs/current/logical-replication.html)
- [Understanding WAL](https://www.postgresql.org/docs/current/wal-intro.html)

### About CDC

- [Change Data Capture Pattern](https://en.wikipedia.org/wiki/Change_data_capture)
- [Debezium CDC Tutorial](https://debezium.io/documentation/reference/tutorial.html)

### About Redpanda Connect

- [Redpanda Connect Docs](https://docs.redpanda.com/redpanda-connect/)
- [PostgreSQL CDC Input](https://docs.redpanda.com/redpanda-connect/components/inputs/postgres_cdc/)

## Project Structure

```
.
├── Makefile                         # Quick commands
├── setup.sh                         # Main setup script
├── docker-compose.yaml              # PostgreSQL + Redpanda Connect
├── config/
│   ├── redpanda-connect.yaml       # CDC connector configuration
│   └── create-publication.sql      # SQL to create CDC publication
├── src/                            # Your application code
└── README.md                       # This file
```

## Next Steps

After setup:

1. **Understand the flow**: Make a change to your database and watch it flow through CDC
2. **Explore the config**: Look at `config/redpanda-connect.yaml` to see how CDC is configured
3. **Customize**: Modify which tables are tracked, add transformations, etc.
4. **Integrate**: Connect CDC events to your analytics, dashboards, or other systems

## Support

- Check `./setup.sh status` for component status
- Check `make logs-connector` for CDC connector logs
- See `TROUBLESHOOTING.md` for common issues
- Open an issue if you find bugs

---

Happy coding! 🚀
