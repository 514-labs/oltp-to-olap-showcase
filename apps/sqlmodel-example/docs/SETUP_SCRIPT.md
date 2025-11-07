# Setup Script Overview

The `setup.sh` script prepares the OLTP + CDC environment used by the SQLModel example. It is safe to rerun and can also be called with specific sub-commands (see `./setup.sh help`).

## Interactive Flow (default)

Running `./setup.sh` with no arguments walks through the full setup:

1. **Start PostgreSQL**  
   - Launches `docker-compose.oltp.yaml` if the container is not already running.  
   - Waits for the database to accept connections on `DB_PORT` (default `5434`).  

2. **Wait for Tables**  
   - Prompts you to run `python init_db.py` (overridable via `DB_MIGRATION_COMMAND`) so the OLTP tables are created.  
   - Polls the database until the tables in `TABLE_NAMES` (customer, product, order, orderitem) are present, with the option to rerun the command if needed.  

3. **Configure CDC**  
   - Creates the logical replication publication (`POSTGRES_CDC_PUBLICATION`).  
   - Creates or verifies the replication slot (`POSTGRES_CDC_SLOT`).  
   - Grants replication privileges to the configured user.  

4. **Verify Prerequisites**  
   - Checks each requirement (database running, publication created, slot active).  
   - Prints next steps and hints if something is missing.  

At the end of the interactive run the script reminds you to start Moose (`moose dev`) which launches Redpanda Connect with the generated configuration.

## Useful Sub-Commands

- `./setup.sh start-db` – start the PostgreSQL container only.  
- `./setup.sh setup-cdc` – run the CDC publication/slot creation steps without touching the database container.  
- `./setup.sh status` – display the status of the database, the CDC publication, and the replication slot.  
- `./setup.sh verify` – re-check that all prerequisites are met (database ready, CDC configured).  
- `./setup.sh logs` / `logs-db` – tail the PostgreSQL logs or the overall compose logs.  
- `./setup.sh restart` – stop and restart PostgreSQL, then re-run CDC setup.  
- `./setup.sh clean` – remove containers and volumes after a confirmation prompt.  

All commands respect the environment variables defined in `.env` (`APP_NAME`, `POSTGRES_DB`, `POSTGRES_CDC_*`, etc.), allowing you to retarget the script to different databases or table sets.
