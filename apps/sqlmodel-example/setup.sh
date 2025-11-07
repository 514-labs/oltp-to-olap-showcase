#!/bin/bash

# SQLModel OLTP + CDC Setup Script
# Sets up PostgreSQL with Change Data Capture (CDC) support for real-time replication

# Note: We use 'set -e' carefully - some functions intentionally return non-zero
# and we handle errors explicitly in loops and conditionals
set -e

# ============================================================================
# Configuration & Environment Setup
# ============================================================================

# Load .env file if it exists
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Project configuration
PROJECT_NAME=${APP_NAME:-sqlmodel}
DB_NAME=${POSTGRES_DB:-sqlmodel_db}
POSTGRES_PORT=${DB_PORT:-5433}
CONTAINER_NAME=${APP_NAME:-sqlmodel}-postgres
CONNECTOR_CONTAINER=redpanda-connect
DB_MIGRATION_COMMAND=${DB_MIGRATION_COMMAND:-python init_db.py}

# CDC configuration
POSTGRES_CDC_SCHEMA=${POSTGRES_CDC_SCHEMA:-public}
POSTGRES_CDC_SLOT=${POSTGRES_CDC_SLOT:-redpanda_cdc_slot}
POSTGRES_CDC_PUBLICATION=${POSTGRES_CDC_PUBLICATION:-redpanda_cdc_publication}

# Parse table names from environment variable
# Supports both JSON array format ["table1","table2"] and comma-separated "table1,table2"
parse_table_names() {
    local input="${POSTGRES_CDC_TABLES:-customer,product,order,orderitem}"
    input=$(echo "$input" | sed 's/^\[//;s/\]$//' | sed 's/"//g' | sed "s/'//g")
    IFS=',' read -ra TABLE_NAMES <<< "$input"
    for i in "${!TABLE_NAMES[@]}"; do
        TABLE_NAMES[$i]=$(echo "${TABLE_NAMES[$i]}" | xargs)
    done
}

parse_table_names

if [ ${#TABLE_NAMES[@]} -eq 0 ]; then
    echo "Error: No tables specified in POSTGRES_CDC_TABLES" >&2
    exit 1
fi

# ============================================================================
# Output Formatting
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

CHECK="✅"
CROSS="❌"
INFO="ℹ️ "
WAIT="⏳"
WRENCH="🔧"
DATABASE="🗄️ "
CHART="📊"
SPARKLE="✨"
PARTY="🎉"

print_header() {
    echo ""
    echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║${NC}  $1"
    echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo ""
    echo -e "${BOLD}${BLUE}────────────────────────────────────────────────────────────${NC}"
    echo -e "${BOLD}$1${NC}"
    echo -e "${BOLD}${BLUE}────────────────────────────────────────────────────────────${NC}"
    echo ""
}

print_info() { echo -e "${INFO} ${CYAN}$1${NC}"; }
print_success() { echo -e "${CHECK} ${GREEN}$1${NC}"; }
print_error() { echo -e "${CROSS} ${RED}$1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_waiting() { echo -e "${WAIT} $1"; }

debug() {
    [ "${DEBUG:-0}" = "1" ] && echo "DEBUG: $1" >&2
}

# ============================================================================
# Database Helper Functions
# ============================================================================

# Execute PostgreSQL query and return result
# Returns empty string on error (doesn't fail script)
run_query() {
    local query="$1"
    local db="${2:-$DB_NAME}"
    docker exec "$CONTAINER_NAME" psql -U postgres -d "$db" -tAc "$query" 2>/dev/null || echo ""
}

# Check if a specific table exists
table_exists() {
    local table="$1"
    [ -z "$table" ] && return 1
    
    local result=$(run_query "SELECT 1 FROM information_schema.tables WHERE table_schema='$POSTGRES_CDC_SCHEMA' AND table_name='$table'")
    
    # Check if result contains "1" (table exists)
    if [ -n "$result" ] && echo "$result" | grep -q "^[[:space:]]*1[[:space:]]*$"; then
        return 0
    else
        return 1
    fi
}

# Check if all required tables exist
tables_exist() {
    [ ${#TABLE_NAMES[@]} -eq 0 ] && return 1
    
    debug "Checking ${#TABLE_NAMES[@]} tables: ${TABLE_NAMES[*]} in schema '$POSTGRES_CDC_SCHEMA'"
    
    for table in "${TABLE_NAMES[@]}"; do
        [ -z "$table" ] && continue
        # Check table existence - capture return code to avoid set -e issues
        if ! table_exists "$table" 2>/dev/null; then
            debug "Table '$table' NOT FOUND in schema '$POSTGRES_CDC_SCHEMA'"
            return 1
        fi
    done
    
    debug "All tables found!"
    return 0
}

# Count how many required tables exist
count_existing_tables() {
    local count=0
    for table in "${TABLE_NAMES[@]}"; do
        [ -z "$table" ] && continue
        table_exists "$table" && count=$((count + 1))
    done
    echo "$count"
}

# Get list of missing tables
get_missing_tables() {
    local missing=()
    for table in "${TABLE_NAMES[@]}"; do
        [ -z "$table" ] && continue
        ! table_exists "$table" && missing+=("$table")
    done
    echo "${missing[*]}"
}

# ============================================================================
# Setup Functions
# ============================================================================

check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running"
        echo "Please start Docker Desktop and try again."
        exit 1
    fi
}

start_db() {
    print_step "Step 1: Starting PostgreSQL ${DATABASE}"
    
    print_info "What this does:"
    echo "   Starts a PostgreSQL 15 database configured for logical replication (required for CDC)."
    echo "   Port: ${POSTGRES_PORT}"
    echo "   Database: ${DB_NAME}"
    echo "   User: postgres"
    echo ""
    
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        print_success "PostgreSQL is already running!"
        return 0
    fi
    
    print_info "Running: docker compose -f docker-compose.oltp.yaml up -d"
    echo ""
    docker compose -f docker-compose.oltp.yaml up -d
    
    print_success "Container started!"
    print_waiting "Waiting for PostgreSQL to be ready..."
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker exec "$CONTAINER_NAME" pg_isready -U postgres > /dev/null 2>&1; then
            print_success "PostgreSQL is ready and accepting connections!"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
        echo -n "."
    done
    
    echo ""
    print_error "PostgreSQL did not become ready in time"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check logs: docker logs ${CONTAINER_NAME}"
    echo "  2. Check if port ${POSTGRES_PORT} is available"
    echo "  3. Try: ./setup.sh restart"
    exit 1
}

run_db_setup() {
    print_info "Running database initialization command:"
    echo -e "   ${BOLD}$ ${DB_MIGRATION_COMMAND}${NC}"
    echo ""
    
    if eval "${DB_MIGRATION_COMMAND}"; then
        print_success "Database initialization command completed successfully!"
    else
        print_error "Database initialization command failed"
        echo ""
        echo "Troubleshooting:"
        echo "  1. Check the command output above for errors"
        echo "  2. Ensure dependencies are installed (pip install -e .)"
        echo "  3. Re-run the command manually once the issue is resolved"
        exit 1
    fi
}

wait_for_tables() {
    print_step "Step 2: Waiting for Tables ${CHART}"
    
    print_info "What this does:"
    echo "   Your application needs to create tables in the database before we can set up CDC."
    echo "   Required tables: $(IFS=','; echo "${TABLE_NAMES[*]}")"
    echo ""
    
    if tables_exist; then
        print_success "All tables already exist!"
        return 0
    fi
    
    print_info "This step creates tables using your SQLModel definitions."
    echo -e "   Command to run: ${BOLD}$ ${DB_MIGRATION_COMMAND}${NC}"
    echo ""
    
    read -r -p "Run this command now? [Y/n] " run_command
    if [[ -z "$run_command" || "$run_command" =~ ^[Yy]$ ]]; then
        run_db_setup
    else
        print_warning "Skipping automatic table creation. Run the command manually in another terminal."
    fi
    
    print_waiting "Watching for tables to appear..."
    debug "Looking for ${#TABLE_NAMES[@]} tables: ${TABLE_NAMES[*]}"
    
    local timeout=300
    local elapsed=0
    local check_count=0
    
    while [ $elapsed -lt $timeout ]; do
        check_count=$((check_count + 1))
        
        # Check if tables exist
        # Temporarily disable set -e to check return code
        set +e
        tables_exist 2>/dev/null
        local tables_check=$?
        set -e
        
        if [ $tables_check -eq 0 ]; then
            echo ""
            print_success "All tables found! (after ${elapsed}s and ${check_count} checks)"
            return 0
        fi
        
        if [ $((elapsed % 10)) -eq 0 ] && [ $elapsed -gt 0 ]; then
            echo -n "."
        fi
        
        sleep 5
        elapsed=$((elapsed + 5))
        
        if [ $((elapsed % 30)) -eq 0 ]; then
            echo ""
            print_waiting "Still waiting... (${elapsed}s elapsed, ${check_count} checks)"
            
            # Get missing tables (may fail if container unavailable, so handle gracefully)
            local missing=""
            set +e
            missing=$(get_missing_tables 2>/dev/null)
            set -e
            
            if [ -n "$missing" ]; then
                echo "   Missing tables: $(IFS=','; echo "$missing")"
                echo "   Schema being checked: '$POSTGRES_CDC_SCHEMA'"
            else
                echo "   (Could not check tables - container may be temporarily unavailable)"
            fi
            
            read -r -t 5 -p "Press 'r' to rerun ${DB_MIGRATION_COMMAND}, 's' to skip, or wait to continue: " input || true
            if [[ "$input" =~ ^[Rr]$ ]]; then
                run_db_setup
                elapsed=0
                check_count=0
                print_waiting "Watching for tables to appear..."
            elif [[ "$input" =~ ^[Ss]$ ]]; then
                print_warning "Skipping table check..."
                return 0
            fi
        fi
    done
    
    echo ""
    print_error "Tables not found after ${timeout} seconds"
    echo ""
    
    echo "Diagnostic information:"
    echo "  Looking for: $(IFS=','; echo "${TABLE_NAMES[*]}")"
    echo "  Schema: $POSTGRES_CDC_SCHEMA"
    echo "  Database: $DB_NAME"
    echo ""
    echo "  Tables that actually exist in database:"
    
    local existing_tables=$(run_query "SELECT table_name FROM information_schema.tables WHERE table_schema='$POSTGRES_CDC_SCHEMA' AND table_type='BASE TABLE' ORDER BY table_name")
    
    if [ -n "$existing_tables" ]; then
        echo "$existing_tables" | sed 's/^/    - /'
        echo ""
        echo "⚠️  MISMATCH DETECTED!"
        echo ""
        echo "The table names in your POSTGRES_CDC_TABLES don't match the actual database tables."
        echo ""
        echo "Current POSTGRES_CDC_TABLES: $(IFS=','; echo "${TABLE_NAMES[*]}")"
        echo "Actual database tables: $(echo "$existing_tables" | tr '\n' ',' | sed 's/,$//')"
        echo ""
        echo "Update your .env file to use the correct table names:"
        echo "  POSTGRES_CDC_TABLES=[\"$(echo "$existing_tables" | tr '\n' ',' | sed 's/,$//' | sed 's/,/","/g')\"]"
        echo ""
    else
        echo "    (Could not query database or no tables found)"
    fi
    
    echo "Make sure ${DB_MIGRATION_COMMAND} completed successfully and retry."
    echo "Or set DEBUG=1 to see detailed diagnostic output: DEBUG=1 ./setup.sh"
    exit 1
}

setup_cdc() {
    print_step "Step 3: Configure CDC ${WRENCH}"
    
    print_info "What this does:"
    echo "   Sets up PostgreSQL for Change Data Capture (CDC):"
    echo "   1. ${BOLD}Publication${NC}: Tells Postgres which tables to track"
    echo "   2. ${BOLD}Replication Slot${NC}: Buffer for change events"
    echo ""
    echo "   This allows Redpanda Connect to stream database changes in real-time."
    echo ""
    
    # Check/create publication
    local pub_exists=$(run_query "SELECT COUNT(*) FROM pg_publication WHERE pubname='$POSTGRES_CDC_PUBLICATION'" | tr -d '[:space:]')
    
    if [ -n "$pub_exists" ] && [ "$pub_exists" -gt 0 ]; then
        print_success "CDC publication already exists!"
    else
        print_info "Creating CDC publication..."
        
        if [ -f "scripts/create-publication.sql" ]; then
            docker exec -i "$CONTAINER_NAME" psql -U postgres -d "$DB_NAME" < scripts/create-publication.sql
        else
            run_query "CREATE PUBLICATION $POSTGRES_CDC_PUBLICATION FOR ALL TABLES;" > /dev/null
        fi
        
        print_success "Publication created!"
    fi
    
    # Check/create replication slot (cluster-wide, not database-specific)
    local slot_exists=$(run_query "SELECT COUNT(*) FROM pg_replication_slots WHERE slot_name='$POSTGRES_CDC_SLOT'" postgres | tr -d '[:space:]')
    
    if [ -n "$slot_exists" ] && [ "$slot_exists" -gt 0 ]; then
        print_success "Replication slot already exists!"
    else
        print_info "Creating replication slot..."
        run_query "SELECT pg_create_logical_replication_slot('$POSTGRES_CDC_SLOT', 'pgoutput');" > /dev/null
        print_success "Replication slot created!"
    fi
    
    echo ""
    print_success "CDC configuration complete!"
}

verify_all() {
    print_step "Step 4: Verify CDC Setup ${SPARKLE}"
    
    local all_good=true
    
    # Check PostgreSQL
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        print_success "PostgreSQL: Running"
    else
        print_error "PostgreSQL: Not running"
        all_good=false
    fi
    
    # Check tables
    local table_count=$(count_existing_tables)
    if [ $table_count -eq ${#TABLE_NAMES[@]} ]; then
        print_success "Tables: All ${table_count} tables found"
    else
        print_warning "Tables: Only ${table_count}/${#TABLE_NAMES[@]} tables found"
        all_good=false
    fi
    
    # Check CDC publication
    local pub_result=$(run_query "SELECT COUNT(*) FROM pg_publication WHERE pubname='$POSTGRES_CDC_PUBLICATION'")
    local pub_exists=$(echo "$pub_result" | tr -d '[:space:]')
    
    if echo "$pub_result" | grep -qi "error\|fatal\|could not"; then
        print_error "CDC Publication: Query failed - $(echo "$pub_result" | head -1)"
        all_good=false
    elif [ -n "$pub_exists" ] && [[ "$pub_exists" =~ ^[0-9]+$ ]] && [ "$pub_exists" -gt 0 ]; then
        print_success "CDC Publication: Configured"
    else
        print_error "CDC Publication: Not found (count: '$pub_exists')"
        all_good=false
    fi
    
    # Check replication slot (cluster-wide)
    local slot_result=$(run_query "SELECT COUNT(*) FROM pg_replication_slots WHERE slot_name='$POSTGRES_CDC_SLOT'" postgres)
    local slot_exists=$(echo "$slot_result" | tr -d '[:space:]')
    
    if echo "$slot_result" | grep -qi "error\|fatal\|could not"; then
        print_error "Replication Slot: Query failed - $(echo "$slot_result" | head -1)"
        all_good=false
    elif [ -n "$slot_exists" ] && [[ "$slot_exists" =~ ^[0-9]+$ ]] && [ "$slot_exists" -gt 0 ]; then
        print_success "Replication Slot: Active"
    else
        print_error "Replication Slot: Not found (count: '$slot_exists')"
        all_good=false
    fi
    
    echo ""
    
    if [ "$all_good" = true ]; then
        print_success "${PARTY} CDC prerequisites complete!"
        echo ""
        echo "Next steps:"
        echo -e "  ${BOLD}1.${NC} Start Moose (includes Redpanda Connect): ${CYAN}moose dev${NC}"
        echo -e "  ${BOLD}2.${NC} Activate your virtualenv and start FastAPI:"
        echo -e "     ${CYAN}source venv/bin/activate && fastapi dev src/main.py --port 3002${NC}"
        echo -e "  ${BOLD}3.${NC} (Optional) Launch the test client: ${CYAN}cd ../test-client && pnpm dev${NC}"
        echo ""
        echo -e "Check status anytime: ${CYAN}./setup.sh status${NC}"
        echo ""
    else
        print_warning "Some components are not properly configured"
        echo ""
        echo "Run './setup.sh status' to see what's missing"
        exit 1
    fi
}

# ============================================================================
# Status & Utility Functions
# ============================================================================

show_status() {
    print_header "${PROJECT_NAME} CDC Setup Status"
    
    # PostgreSQL status
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        print_success "PostgreSQL: Running (port ${POSTGRES_PORT})"
        echo "   └─ Container: ${CONTAINER_NAME}"
        echo "   └─ Database: ${DB_NAME}"
        if docker exec "$CONTAINER_NAME" pg_isready -U postgres > /dev/null 2>&1; then
            echo -e "   └─ Health: ${GREEN}Healthy${NC}"
        else
            echo -e "   └─ Health: ${RED}Unhealthy${NC}"
        fi
    else
        print_error "PostgreSQL: Not running"
        echo "   └─ Start with: ./setup.sh start-db"
    fi
    
    echo ""
    
    # Tables status
    local table_count=$(count_existing_tables)
    if [ $table_count -gt 0 ]; then
        print_success "Tables: ${table_count} tables found"
        echo "   └─ $(IFS=','; echo "${TABLE_NAMES[*]}")"
    else
        print_warning "Tables: No tables found"
        echo "   └─ Run your app to create tables"
    fi
    
    echo ""
    
    # CDC publication status
    local pub_exists=$(run_query "SELECT COUNT(*) FROM pg_publication WHERE pubname='$POSTGRES_CDC_PUBLICATION'" | tr -d '[:space:]')
    
    if [ -n "$pub_exists" ] && [ "$pub_exists" -gt 0 ]; then
        print_success "CDC Publication: Configured"
        local pub_tables=$(run_query "SELECT COUNT(*) FROM pg_publication_tables WHERE pubname='$POSTGRES_CDC_PUBLICATION'" | tr -d '[:space:]' || echo "0")
        echo "   └─ Name: $POSTGRES_CDC_PUBLICATION"
        echo "   └─ Tables: ${pub_tables} tables"
    else
        print_warning "CDC Publication: Not configured"
        echo "   └─ Setup with: ./setup.sh setup-cdc"
    fi
    
    echo ""
    
    # Replication slot status (cluster-wide)
    local slot_exists=$(run_query "SELECT COUNT(*) FROM pg_replication_slots WHERE slot_name='$POSTGRES_CDC_SLOT'" postgres | tr -d '[:space:]')
    
    if [ -n "$slot_exists" ] && [ "$slot_exists" -gt 0 ]; then
        print_success "Replication Slot: Active"
        echo "   └─ Name: $POSTGRES_CDC_SLOT"
        echo "   └─ Type: logical"
    else
        print_warning "Replication Slot: Not found"
        echo "   └─ Setup with: ./setup.sh setup-cdc"
    fi
    
    echo ""
    
    # Redpanda Connect status
    if docker ps --format '{{.Names}}' | grep -q "^${CONNECTOR_CONTAINER}$"; then
        print_success "Redpanda Connect: Running"
        echo "   └─ Container: ${CONNECTOR_CONTAINER}"
        echo "   └─ Logs: docker logs ${CONNECTOR_CONTAINER}"
    else
        print_info "Redpanda Connect: Not running"
        echo -e "   └─ Start with: ${CYAN}moose dev${NC}"
    fi
    
    echo ""
    print_info "Next steps: ${BOLD}${CYAN}moose dev${NC}, then activate your venv and run ${BOLD}${CYAN}fastapi dev src/main.py --port 3002${NC}"
    echo ""
}

stop_all() {
    print_info "Stopping all services..."
    docker compose -f docker-compose.oltp.yaml down
    docker compose -f docker-compose.dev.override.yaml down 2>/dev/null || true
    print_success "All services stopped"
}

cleanup() {
    print_warning "This will remove all containers and volumes"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Cleaning up..."
        docker compose -f docker-compose.oltp.yaml down -v
        docker compose -f docker-compose.dev.override.yaml down -v 2>/dev/null || true
        print_success "Cleanup complete"
    else
        print_info "Cleanup cancelled"
    fi
}

show_help() {
    cat << EOF
Usage: ./setup.sh [command]

Commands:
  (no args)        Interactive setup - walk through CDC prerequisites
  all              Run all prerequisite steps automatically

  start-db         Start PostgreSQL database
  setup-cdc        Configure CDC (publication + replication slot)

  status           Show status of CDC prerequisites
  verify           Verify CDC setup is complete

  logs             Show logs from all services
  logs-db          Show PostgreSQL logs

  stop             Stop PostgreSQL
  restart          Restart PostgreSQL and reconfigure CDC
  clean            Remove all containers and volumes

  help             Show this help message

Examples:
  ./setup.sh              # Interactive mode (recommended)
  ./setup.sh all          # Run all prerequisite steps
  ./setup.sh status       # Check CDC setup status

After setup is complete, run:
  moose dev                                 # Start Moose (includes Redpanda Connect)
  source venv/bin/activate                  # Activate Python virtualenv
  fastapi dev src/main.py --port 3002       # Start the FastAPI server
  (optional) cd ../test-client && pnpm dev  # Launch the test client

EOF
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    check_docker
    
    # Debug output
    if [ "${DEBUG:-0}" = "1" ]; then
        echo "DEBUG: CDC Configuration:" >&2
        echo "  POSTGRES_CDC_SCHEMA: '$POSTGRES_CDC_SCHEMA'" >&2
        echo "  POSTGRES_CDC_SLOT: '$POSTGRES_CDC_SLOT'" >&2
        echo "  POSTGRES_CDC_PUBLICATION: '$POSTGRES_CDC_PUBLICATION'" >&2
        echo "  TABLE_NAMES (${#TABLE_NAMES[@]}): ${TABLE_NAMES[*]}" >&2
        echo "  DB_NAME: '$DB_NAME'" >&2
        echo "  CONTAINER_NAME: '$CONTAINER_NAME'" >&2
        echo "" >&2
    fi
    
    case "${1:-interactive}" in
        interactive)
            print_header "${PROJECT_NAME} OLTP + CDC Prerequisites"
            echo "This script will set up your database with CDC support."
            echo ""
            echo -e "After this completes, run: ${BOLD}${CYAN}moose dev${NC} and start FastAPI via ${BOLD}${CYAN}fastapi dev src/main.py --port 3002${NC}"
            echo ""
            echo "Press Enter to continue, or Ctrl+C to cancel..."
            read
            
            start_db
            wait_for_tables
            setup_cdc
            verify_all
            ;;
        all)
            start_db
            sleep 2
            setup_cdc
            verify_all
            ;;
        start-db)
            start_db
            ;;
        setup-cdc)
            setup_cdc
            ;;
        status)
            show_status
            ;;
        verify)
            verify_all
            ;;
        logs)
            docker compose -f docker-compose.oltp.yaml logs -f
            ;;
        logs-db)
            docker logs -f "$CONTAINER_NAME"
            ;;
        stop)
            stop_all
            ;;
        restart)
            stop_all
            sleep 2
            start_db
            setup_cdc
            verify_all
            ;;
        clean)
            cleanup
            ;;
        help)
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
