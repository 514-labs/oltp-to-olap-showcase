# TypeORM CDC Pipeline Documentation

Complete documentation for the TypeORM → Moose OLAP migration with real-time CDC.

## 📖 Documentation Structure

### Getting Started
- **[../README.md](../README.md)** - Main project README with quick start
- **[../LICENSE_SETUP.md](../LICENSE_SETUP.md)** - Redpanda Enterprise license setup
- **[MOOSE_CDC_QUICKSTART.md](MOOSE_CDC_QUICKSTART.md)** - Quick start guide (5 minutes)

### Detailed Guides
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Complete setup and troubleshooting guide
  - Architecture overview
  - Startup flow
  - Common issues and fixes
  - Production considerations

### Architecture & Design
- **[CDC_PIPELINE_DESIGN.md](CDC_PIPELINE_DESIGN.md)** - CDC pipeline architecture
  - Component overview
  - Message formats
  - Data flow
  - Error handling
  - Performance tuning

- **[OLAP_CONVERSION_GUIDE.md](OLAP_CONVERSION_GUIDE.md)** - OLTP to OLAP conversion
  - TypeORM entity → Moose OlapTable patterns
  - Type mappings
  - Star schema design
  - Best practices

- **[FACT_TABLE_STRATEGY.md](FACT_TABLE_STRATEGY.md)** - Fact table design patterns
  - Denormalization strategies
  - Order fact table examples
  - Performance optimization

### Reference
- **[reference/REDPANDA_CONNECT_SETUP.md](reference/REDPANDA_CONNECT_SETUP.md)** - Redpanda Connect configuration reference
- **[reference/LLM_PROMPT.md](reference/LLM_PROMPT.md)** - LLM conversion methodology

## 🎯 Quick Navigation

**I'm new here** → Start with [../README.md](../README.md)

**I need a license** → See [../LICENSE_SETUP.md](../LICENSE_SETUP.md)

**I want to run the demo** → Follow [MOOSE_CDC_QUICKSTART.md](MOOSE_CDC_QUICKSTART.md)

**I have setup issues** → Check [SETUP_GUIDE.md#troubleshooting](SETUP_GUIDE.md#troubleshooting)

**I want to understand the architecture** → Read [CDC_PIPELINE_DESIGN.md](CDC_PIPELINE_DESIGN.md)

**I want to convert my models** → Study [OLAP_CONVERSION_GUIDE.md](OLAP_CONVERSION_GUIDE.md)

## 📁 Project Files

### Configuration
- `docker-compose.oltp.yaml` - OLTP PostgreSQL service
- `docker-compose.dev.override.yaml` - CDC services (Moose/Redpanda)
- `redpanda-connect.yaml` - CDC connector configuration
- `moose.config.toml` - Moose framework settings

### Scripts
- `start-oltp.sh` - Start OLTP application (PostgreSQL + setup tables)
- `moose-cdc-setup.sh` - CDC setup hook (runs on Moose first start)
- `init-postgres.sh` - PostgreSQL initialization (creates publication/replication slot)

### Source Code
- `src/entities/` - TypeORM OLTP entities
- `src/index.ts` - Express API server
- `src/setup-db.ts` - Database initialization script
- `app/index.ts` - Moose OLAP table definitions

## 🚨 Common Issues

### Redpanda Connect won't start
**Symptom:** Container exits immediately
**Solution:** Check license is set: `echo $REDPANDA_LICENSE`

### "Waiting for tables" persists
**Symptom:** `cdc-setup` container keeps waiting
**Solution:** Run `pnpm dev` to start API and create tables

### Publication errors
**Symptom:** SQL errors about publication already exists
**Solution:** See [SETUP_GUIDE.md#publication-already-exists-error](SETUP_GUIDE.md#publication-already-exists-error)

### Topic shows "typeorm.public.null"
**Symptom:** Wrong topic name in CDC events
**Solution:** Check redpanda-connect.yaml configuration

## 🎓 External Resources

- [PostgreSQL Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)
- [Redpanda Connect Documentation](https://docs.redpanda.com/redpanda-connect/)
- [Moose Framework Docs](https://docs.fiveonefour.com/moose/)
- [ClickHouse Documentation](https://clickhouse.com/docs/)
- [TypeORM Documentation](https://typeorm.io/)

## 📝 Documentation Status

Last updated: 2025-10-21

✅ Quick start guide
✅ Complete setup documentation
✅ Architecture and design docs
✅ Conversion methodology
✅ Reference documentation
✅ Troubleshooting guides
