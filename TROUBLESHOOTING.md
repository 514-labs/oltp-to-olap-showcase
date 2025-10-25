# Troubleshooting Guide

Common issues and their solutions for the OLTP + CDC setup.

## Table of Contents

- [Setup Issues](#setup-issues)
- [PostgreSQL Issues](#postgresql-issues)
- [CDC Issues](#cdc-issues)
- [Connector Issues](#connector-issues)
- [Performance Issues](#performance-issues)

---

## Setup Issues

### Docker not running

**Error:**
```
Cannot connect to the Docker daemon
```

**Solution:**
1. Start Docker Desktop
2. Wait for Docker to be fully started
3. Try again: `./setup.sh start-db`

### Port already in use

**Error:**
```
Error: bind: address already in use
```

**Solution:**
```bash
# Find what's using the port
lsof -i :{{PORT}}

# Either stop that process, or change the port in docker-compose.yaml
# Then restart
make restart
```

### Permission denied on setup.sh

**Error:**
```
-bash: ./setup.sh: Permission denied
```

**Solution:**
```bash
chmod +x setup.sh
./setup.sh
```

---

## PostgreSQL Issues

### Container fails to start

**Symptoms:**
- Container starts then immediately stops
- `docker ps` doesn't show the postgres container

**Debug:**
```bash
# Check logs
make logs-db

# Common causes:
# 1. Port conflict (see above)
# 2. Corrupted volume
# 3. Insufficient resources
```

**Solution for corrupted volume:**
```bash
# Remove and recreate
make clean
make start-db
```

### Cannot connect to PostgreSQL

**Symptoms:**
```
psql: error: connection to server at "localhost", port {{PORT}} failed
```

**Debug:**
```bash
# 1. Check container is running
docker ps | grep postgres

# 2. Check health
docker inspect {{PROJECT_NAME}}-oltp-postgres | grep Health -A 10

# 3. Check logs
make logs-db
```

**Solutions:**
```bash
# If not running
make start-db

# If unhealthy, check logs and restart
make restart
```

### Database not ready

**Symptoms:**
- Container is running but database isn't accepting connections

**Solution:**
```bash
# Wait a bit longer (can take 10-30 seconds)
# Check readiness
docker exec {{PROJECT_NAME}}-oltp-postgres pg_isready -U postgres

# If it doesn't become ready after a minute, check logs
make logs-db
```

---

## CDC Issues

### Publication already exists error

**Error:**
```
ERROR: publication "redpanda_cdc_publication" already exists
```

**Solution:**
This is usually safe to ignore. The CDC setup checks for existing publications.

To recreate:
```bash
# Connect to database
docker exec -it {{PROJECT_NAME}}-oltp-postgres psql -U postgres -d {{DB_NAME}}

# Drop and recreate
DROP PUBLICATION redpanda_cdc_publication;
\q

# Run setup again
./setup.sh setup-cdc
```

### Replication slot already exists

**Error:**
```
ERROR: replication slot "redpanda_cdc_slot" already exists
```

**Solution:**
```bash
# Check if slot is active
docker exec {{PROJECT_NAME}}-oltp-postgres psql -U postgres -d {{DB_NAME}} -c \
  "SELECT * FROM pg_replication_slots WHERE slot_name='redpanda_cdc_slot';"

# If active and in use, don't delete it
# If inactive, you can drop and recreate:

docker exec {{PROJECT_NAME}}-oltp-postgres psql -U postgres -d {{DB_NAME}} -c \
  "SELECT pg_drop_replication_slot('redpanda_cdc_slot');"

# Run setup again
./setup.sh setup-cdc
```

### Tables not in publication

**Symptoms:**
- CDC is set up but changes aren't captured for all tables

**Solution:**
```bash
# Check which tables are in publication
docker exec {{PROJECT_NAME}}-oltp-postgres psql -U postgres -d {{DB_NAME}} -c \
  "SELECT * FROM pg_publication_tables WHERE pubname='redpanda_cdc_publication';"

# Add missing tables
docker exec {{PROJECT_NAME}}-oltp-postgres psql -U postgres -d {{DB_NAME}} -c \
  "ALTER PUBLICATION redpanda_cdc_publication ADD TABLE your_table_name;"

# Or recreate publication with all tables
docker exec {{PROJECT_NAME}}-oltp-postgres psql -U postgres -d {{DB_NAME}} -c \
  "DROP PUBLICATION redpanda_cdc_publication; \
   CREATE PUBLICATION redpanda_cdc_publication FOR ALL TABLES;"
```

### Replication slot lag growing

**Symptoms:**
- `pg_replication_slots` shows large `pg_wal_lsn_diff`
- Disk usage growing

**Debug:**
```bash
# Check replication lag
docker exec {{PROJECT_NAME}}-oltp-postgres psql -U postgres -d {{DB_NAME}} -c \
  "SELECT slot_name, active, pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS lag_bytes \
   FROM pg_replication_slots \
   WHERE slot_name='redpanda_cdc_slot';"
```

**Solutions:**
```bash
# 1. Check if connector is running and consuming
make logs-connector

# 2. If connector is stopped, start it
./setup.sh start-connector

# 3. If lag is huge and you don't need old events, reset the slot:
docker exec {{PROJECT_NAME}}-oltp-postgres psql -U postgres -d {{DB_NAME}} -c \
  "SELECT pg_drop_replication_slot('redpanda_cdc_slot'); \
   SELECT pg_create_logical_replication_slot('redpanda_cdc_slot', 'pgoutput');"

# Restart connector
docker restart {{PROJECT_NAME}}-redpanda-connect
```

---

## Connector Issues

### Connector won't start

**Symptoms:**
- Container starts then immediately exits
- `docker ps` doesn't show redpanda-connect

**Debug:**
```bash
# Check logs
make logs-connector

# Check exit code
docker inspect {{PROJECT_NAME}}-redpanda-connect | grep ExitCode
```

**Common causes:**

1. **Config file not found:**
   ```
   Error: open /connect.yaml: no such file or directory
   ```
   Solution: Make sure `config/redpanda-connect.yaml` exists

2. **Invalid config:**
   ```
   Error: failed to parse config
   ```
   Solution: Check YAML syntax in `config/redpanda-connect.yaml`

3. **License required:**
   ```
   Error: license required for postgres_cdc input
   ```
   Solution: Set REDPANDA_LICENSE environment variable:
   ```bash
   export REDPANDA_LICENSE="your-license-key"
   docker restart {{PROJECT_NAME}}-redpanda-connect
   ```

### Connector can't connect to PostgreSQL

**Error in logs:**
```
Failed to connect to postgres: dial tcp: lookup ... no such host
```

**Solutions:**
```bash
# 1. Check postgres is running
docker ps | grep postgres

# 2. Check they're on the same network
docker network inspect {{NETWORK_NAME}}

# 3. Verify connection string in config/redpanda-connect.yaml
# Should be: postgres://postgres:postgres@{{PROJECT_NAME}}-oltp-postgres:5432/{{DB_NAME}}

# 4. Restart connector
docker restart {{PROJECT_NAME}}-redpanda-connect
```

### Replication slot not found

**Error in logs:**
```
replication slot "redpanda_cdc_slot" does not exist
```

**Solution:**
```bash
# Run CDC setup
./setup.sh setup-cdc

# Restart connector
docker restart {{PROJECT_NAME}}-redpanda-connect
```

### No changes being captured

**Symptoms:**
- Connector is running
- No errors in logs
- But changes to database aren't showing up

**Debug:**
```bash
# 1. Verify CDC is set up
./setup.sh verify

# 2. Check replication slot is being consumed
docker exec {{PROJECT_NAME}}-oltp-postgres psql -U postgres -d {{DB_NAME}} -c \
  "SELECT * FROM pg_replication_slots WHERE slot_name='redpanda_cdc_slot';"

# 3. Check connector logs for activity
make logs-connector

# 4. Make a test change
docker exec {{PROJECT_NAME}}-oltp-postgres psql -U postgres -d {{DB_NAME}} -c \
  "INSERT INTO customers (name) VALUES ('Test User');"

# 5. Watch logs
make logs-connector
```

**Solutions:**
```bash
# If slot shows active=false, restart connector
docker restart {{PROJECT_NAME}}-redpanda-connect

# If tables aren't in publication, add them
docker exec {{PROJECT_NAME}}-oltp-postgres psql -U postgres -d {{DB_NAME}} -c \
  "ALTER PUBLICATION redpanda_cdc_publication ADD TABLE your_table;"
```

### Connector consuming too much memory

**Symptoms:**
- High memory usage
- Connector crashes with OOM errors

**Solutions:**
```bash
# 1. Check replication slot lag (see above)
# Large lag means large buffer

# 2. Reduce batch size in config/redpanda-connect.yaml:
# Add under input.postgres_cdc:
#   poll_interval: "1s"
#   batching:
#     count: 100

# 3. Increase resources for Docker Desktop

# 4. Reset slot if lag is too large (see above)
```

---

## Performance Issues

### High PostgreSQL CPU usage

**Possible causes:**
1. Too many WAL senders
2. Inefficient queries from your app
3. Missing indexes

**Solutions:**
```bash
# Check active connections
docker exec {{PROJECT_NAME}}-oltp-postgres psql -U postgres -d {{DB_NAME}} -c \
  "SELECT * FROM pg_stat_activity WHERE state='active';"

# Check slow queries
docker exec {{PROJECT_NAME}}-oltp-postgres psql -U postgres -d {{DB_NAME}} -c \
  "SELECT query, calls, total_time, mean_time \
   FROM pg_stat_statements \
   ORDER BY total_time DESC LIMIT 10;"
```

### High disk usage

**Possible causes:**
1. WAL files accumulating (replication slot not being consumed)
2. Large database

**Solutions:**
```bash
# Check disk usage
docker exec {{PROJECT_NAME}}-oltp-postgres du -sh /var/lib/postgresql/data

# Check WAL files
docker exec {{PROJECT_NAME}}-oltp-postgres ls -lh /var/lib/postgresql/data/pg_wal

# Check replication lag (see CDC Issues above)
```

### Slow CDC event processing

**Symptoms:**
- Events take a long time to appear in Kafka
- Growing replication lag

**Solutions:**
```bash
# 1. Check connector performance
make logs-connector

# 2. Check network between connector and Redpanda
# (if using external Redpanda)

# 3. Increase connector resources in docker-compose.yaml:
# services:
#   redpanda-connect:
#     deploy:
#       resources:
#         limits:
#           cpus: '2'
#           memory: 2G
```

---

## General Debugging Tips

### Check everything at once

```bash
./setup.sh status
```

### View all logs together

```bash
docker compose logs -f
```

### Restart everything fresh

```bash
make clean
make start
```

### Connect to PostgreSQL manually

```bash
# Via docker
docker exec -it {{PROJECT_NAME}}-oltp-postgres psql -U postgres -d {{DB_NAME}}

# Via local psql
psql postgresql://postgres:postgres@localhost:{{PORT}}/{{DB_NAME}}
```

### Useful PostgreSQL queries

```sql
-- Check all tables
\dt

-- Check publication
SELECT * FROM pg_publication;
SELECT * FROM pg_publication_tables;

-- Check replication slots
SELECT * FROM pg_replication_slots;

-- Check WAL sender processes
SELECT * FROM pg_stat_replication;

-- Check database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Check table sizes
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname='public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Still Having Issues?

1. **Collect diagnostics:**
   ```bash
   # Save all logs
   docker compose logs > debug.log

   # Save status
   ./setup.sh status > status.txt

   # Save container info
   docker ps -a > containers.txt
   docker network ls > networks.txt
   ```

2. **Check documentation:**
   - PostgreSQL: https://www.postgresql.org/docs/
   - Redpanda Connect: https://docs.redpanda.com/redpanda-connect/

3. **Reset and try again:**
   ```bash
   make clean
   make start
   ```

4. **Open an issue** with:
   - What you were trying to do
   - Error messages
   - Relevant logs
   - Steps to reproduce
