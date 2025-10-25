#!/bin/bash

# Template Setup Script for OLTP + CDC
# Replace typeorm, typeorm_db, 5433, {{TABLE_NAMES}} when copying
set -e

# Configuration - REPLACE THESE VALUES
PROJECT_NAME=${ORM_NAME:-typeorm}
DB_NAME=${POSTGRES_DB:-typeorm_db}
POSTGRES_PORT=${DB_PORT:-5433}
CONTAINER_NAME=${ORM_NAME:-typeorm}-postgres
CONNECTOR_CONTAINER=redpanda-connect

DB_MIGRATION_COMMAND=${DB_MIGRATION_COMMAND:-pnpm setup-db}

# Colors and formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Emoji for better UX
CHECK="✅"
CROSS="❌"
INFO="ℹ️ "
WAIT="⏳"
ROCKET="🚀"
WRENCH="🔧"
DATABASE="🗄️ "
CHART="📊"
RADIO="📡"
SPARKLE="✨"
PARTY="🎉"

# Helper functions
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

print_info() {
    echo -e "${INFO} ${CYAN}$1${NC}"
}

print_success() {
    echo -e "${CHECK} ${GREEN}$1${NC}"
}

print_error() {
    echo -e "${CROSS} ${RED}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_waiting() {
    echo -e "${WAIT} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running"
        echo ""
        echo "Please start Docker Desktop and try again."
        exit 1
    fi
}

# Start PostgreSQL
start_db() {
    print_step "Step 1: Starting PostgreSQL ${DATABASE}"

    print_info "What this does:"
    echo "   Starts a PostgreSQL 15 database configured for"
    echo "   logical replication (required for CDC)."
    echo ""
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

    # Wait for PostgreSQL to be ready
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

# Wait for tables to exist
wait_for_tables() {
    print_step "Step 2: Waiting for Tables ${CHART}"

    print_info "What this does:"
    echo "   Your application needs to create tables in the"
    echo "   database before we can set up CDC."
    echo ""
    echo "   Required tables: ${TABLE_NAMES[*]}"
    echo ""

    # Check if tables already exist
    local all_exist=true
    for table in "${TABLE_NAMES[@]}"; do
        if ! docker exec "$CONTAINER_NAME" psql -U postgres -d "$DB_NAME" -tAc \
            "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='$table'" \
            2>/dev/null | grep -q 1; then
            all_exist=false
            break
        fi
    done

    if [ "$all_exist" = true ]; then
        print_success "All tables already exist!"
        return 0
    fi

    print_info "Please run your application now to create tables:"
    echo "   ${BOLD}$ ${DB_MIGRATION_COMMAND}${NC}"
    echo ""
    echo "Press Enter when tables are created (or 's' to skip)..."

    # Wait for tables with timeout
    local timeout=300  # 5 minutes
    local elapsed=0

    while [ $elapsed -lt $timeout ]; do
        # Check for user input (non-blocking)
        read -t 5 -n 1 input || true

        if [ "$input" = "s" ] || [ "$input" = "S" ]; then
            print_warning "Skipping table check..."
            return 0
        fi

        # Check if all tables exist
        all_exist=true
        for table in "${TABLE_NAMES[@]}"; do
            if ! docker exec "$CONTAINER_NAME" psql -U postgres -d "$DB_NAME" -tAc \
                "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='$table'" \
                2>/dev/null | grep -q 1; then
                all_exist=false
                break
            fi
        done

        if [ "$all_exist" = true ]; then
            echo ""
            print_success "All tables found!"
            return 0
        fi

        elapsed=$((elapsed + 5))
        if [ $((elapsed % 10)) -eq 0 ]; then
            print_waiting "Still waiting... (${elapsed}s elapsed)"
        fi
    done

    echo ""
    print_error "Tables not found after ${timeout} seconds"
    echo ""
    echo "Make sure your application is running and creating tables."
    echo "You can skip this check with 's' if tables already exist."
    exit 1
}

# Setup CDC
setup_cdc() {
    print_step "Step 3: Configure CDC ${WRENCH}"

    print_info "What this does:"
    echo "   Sets up PostgreSQL for Change Data Capture (CDC):"
    echo ""
    echo "   1. ${BOLD}Publication${NC}: Tells Postgres which tables to track"
    echo "   2. ${BOLD}Replication Slot${NC}: Buffer for change events"
    echo ""
    echo "   This allows Redpanda Connect to stream database"
    echo "   changes in real-time without impacting your app."
    echo ""

    # Check if already configured
    if docker exec "$CONTAINER_NAME" psql -U postgres -d "$DB_NAME" -tAc \
        "SELECT 1 FROM pg_publication WHERE pubname='redpanda_cdc_publication'" \
        2>/dev/null | grep -q 1; then
        print_success "CDC publication already exists!"
    else
        print_info "Creating CDC publication..."

        if [ -f "scripts/create-publication.sql" ]; then
            docker exec -i "$CONTAINER_NAME" psql -U postgres -d "$DB_NAME" < scripts/create-publication.sql
        else
            # Fallback if script doesn't exist
            docker exec "$CONTAINER_NAME" psql -U postgres -d "$DB_NAME" <<-EOSQL
                CREATE PUBLICATION redpanda_cdc_publication FOR ALL TABLES;
EOSQL
        fi

        print_success "Publication created!"
    fi

    # Check if replication slot exists
    if docker exec "$CONTAINER_NAME" psql -U postgres -d "$DB_NAME" -tAc \
        "SELECT 1 FROM pg_replication_slots WHERE slot_name='redpanda_cdc_slot'" \
        2>/dev/null | grep -q 1; then
        print_success "Replication slot already exists!"
    else
        print_info "Creating replication slot..."

        docker exec "$CONTAINER_NAME" psql -U postgres -d "$DB_NAME" <<-EOSQL
            SELECT pg_create_logical_replication_slot('redpanda_cdc_slot', 'pgoutput');
EOSQL

        print_success "Replication slot created!"
    fi

    echo ""
    print_success "CDC configuration complete!"
}

# Note: Redpanda Connect is started by 'moose dev', not by this script

# Verify CDC prerequisites
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
    local table_count=0
    for table in "${TABLE_NAMES[@]}"; do
        if docker exec "$CONTAINER_NAME" psql -U postgres -d "$DB_NAME" -tAc \
            "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='$table'" \
            2>/dev/null | grep -q 1; then
            table_count=$((table_count + 1))
        fi
    done

    if [ $table_count -eq ${#TABLE_NAMES[@]} ]; then
        print_success "Tables: All ${table_count} tables found"
    else
        print_warning "Tables: Only ${table_count}/${#TABLE_NAMES[@]} tables found"
        all_good=false
    fi

    # Check CDC publication
    if docker exec "$CONTAINER_NAME" psql -U postgres -d "$DB_NAME" -tAc \
        "SELECT 1 FROM pg_publication WHERE pubname='redpanda_cdc_publication'" \
        2>/dev/null | grep -q 1; then
        print_success "CDC Publication: Configured"
    else
        print_error "CDC Publication: Not found"
        all_good=false
    fi

    # Check replication slot
    if docker exec "$CONTAINER_NAME" psql -U postgres -d "$DB_NAME" -tAc \
        "SELECT 1 FROM pg_replication_slots WHERE slot_name='redpanda_cdc_slot'" \
        2>/dev/null | grep -q 1; then
        print_success "Replication Slot: Active"
    else
        print_error "Replication Slot: Not found"
        all_good=false
    fi

    echo ""

    if [ "$all_good" = true ]; then
        print_success "${PARTY} CDC prerequisites complete!"
        echo ""
        echo "Next steps:"
        echo "  ${BOLD}1. Start Moose (includes Redpanda Connect):${NC}"
        echo "     ${CYAN}moose dev${NC}"
        echo ""
        echo "  2. Make changes to your database and watch CDC events"
        echo "  3. Check status anytime: ${CYAN}./setup.sh status${NC}"
        echo ""
    else
        print_warning "Some components are not properly configured"
        echo ""
        echo "Run './setup.sh status' to see what's missing"
        exit 1
    fi
}

# Show status
show_status() {
    print_header "${PROJECT_NAME} CDC Setup Status"

    # PostgreSQL status
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        print_success "PostgreSQL: Running (port ${POSTGRES_PORT})"
        echo "   └─ Container: ${CONTAINER_NAME}"
        echo "   └─ Database: ${DB_NAME}"
        if docker exec "$CONTAINER_NAME" pg_isready -U postgres > /dev/null 2>&1; then
            echo "   └─ Health: ${GREEN}Healthy${NC}"
        else
            echo "   └─ Health: ${RED}Unhealthy${NC}"
        fi
    else
        print_error "PostgreSQL: Not running"
        echo "   └─ Start with: ./setup.sh start-db"
    fi

    echo ""

    # Tables status
    local table_count=0
    for table in "${TABLE_NAMES[@]}"; do
        if docker exec "$CONTAINER_NAME" psql -U postgres -d "$DB_NAME" -tAc \
            "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='$table'" \
            2>/dev/null | grep -q 1; then
            table_count=$((table_count + 1))
        fi
    done

    if [ $table_count -gt 0 ]; then
        print_success "Tables: ${table_count} tables found"
        echo "   └─ ${TABLE_NAMES[*]}"
    else
        print_warning "Tables: No tables found"
        echo "   └─ Run your app to create tables"
    fi

    echo ""

    # CDC status
    if docker exec "$CONTAINER_NAME" psql -U postgres -d "$DB_NAME" -tAc \
        "SELECT 1 FROM pg_publication WHERE pubname='redpanda_cdc_publication'" \
        2>/dev/null | grep -q 1; then
        print_success "CDC Publication: Configured"

        local pub_tables=$(docker exec "$CONTAINER_NAME" psql -U postgres -d "$DB_NAME" -tAc \
            "SELECT COUNT(*) FROM pg_publication_tables WHERE pubname='redpanda_cdc_publication'" 2>/dev/null || echo "0")
        echo "   └─ Name: redpanda_cdc_publication"
        echo "   └─ Tables: ${pub_tables} tables"
    else
        print_warning "CDC Publication: Not configured"
        echo "   └─ Setup with: ./setup.sh setup-cdc"
    fi

    echo ""

    if docker exec "$CONTAINER_NAME" psql -U postgres -d "$DB_NAME" -tAc \
        "SELECT 1 FROM pg_replication_slots WHERE slot_name='redpanda_cdc_slot'" \
        2>/dev/null | grep -q 1; then
        print_success "Replication Slot: Active"
        echo "   └─ Name: redpanda_cdc_slot"
        echo "   └─ Type: logical"
    else
        print_warning "Replication Slot: Not found"
        echo "   └─ Setup with: ./setup.sh setup-cdc"
    fi

    echo ""

    # Redpanda Connect (started by moose dev)
    if docker ps --format '{{.Names}}' | grep -q "^${CONNECTOR_CONTAINER}$"; then
        print_success "Redpanda Connect: Running"
        echo "   └─ Container: ${CONNECTOR_CONTAINER}"
        echo "   └─ Logs: docker logs ${CONNECTOR_CONTAINER}"
    else
        print_info "Redpanda Connect: Not running"
        echo "   └─ Start with: ${CYAN}moose dev${NC}"
    fi

    echo ""
    print_info "💡 Next: Run ${BOLD}${CYAN}moose dev${NC} to start Redpanda Connect"
    echo ""
}

# Stop all services
stop_all() {
    print_info "Stopping all services..."
    docker compose -f docker-compose.oltp.yaml down
    docker compose -f docker-compose.dev.override.yaml down 2>/dev/null || true
    print_success "All services stopped"
}

# Clean up
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

# Show help
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
  moose dev               # Start Moose (includes Redpanda Connect)

EOF
}

# Main execution
main() {
    check_docker

    case "${1:-interactive}" in
        interactive)
            print_header "${PROJECT_NAME} OLTP + CDC Prerequisites"
            echo "This script will set up your database with CDC support."
            echo ""
            echo "After this completes, run: ${BOLD}${CYAN}moose dev${NC}"
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
