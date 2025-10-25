# Makefile for drizzle OLTP + CDC Setup
# Replace drizzle when copying

.PHONY: help start start-db setup-cdc start-connector status verify logs logs-db logs-connector stop restart clean

# Default target - show help
help:
	@echo ""
	@echo "╔══════════════════════════════════════════════════════════╗"
	@echo "║  drizzle - OLTP + CDC Commands                 "
	@echo "╚══════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "Setup:"
	@echo "  make start           - Complete setup (interactive)"
	@echo "  make start-all       - Complete setup (automatic)"
	@echo "  make start-db        - Start PostgreSQL only"
	@echo "  make setup-cdc       - Configure CDC only"
	@echo "  make start-connector - Start Redpanda Connect only"
	@echo ""
	@echo "Monitoring:"
	@echo "  make status          - Show status of all services"
	@echo "  make verify          - Verify all components working"
	@echo "  make logs            - Tail all logs"
	@echo "  make logs-db         - Tail PostgreSQL logs"
	@echo "  make logs-connector  - Tail Redpanda Connect logs"
	@echo ""
	@echo "Management:"
	@echo "  make stop            - Stop all services"
	@echo "  make restart         - Restart all services"
	@echo "  make clean           - Remove containers and volumes"
	@echo ""
	@echo "Examples:"
	@echo "  make start           # Interactive setup"
	@echo "  make status          # Check what's running"
	@echo "  make logs-connector  # Debug connector issues"
	@echo ""

# Complete setup (interactive)
start:
	@./setup.sh

# Complete setup (automatic)
start-all:
	@./setup.sh all

# Start PostgreSQL database
start-db:
	@./setup.sh start-db

# Setup CDC (publication + replication slot)
setup-cdc:
	@./setup.sh setup-cdc

# Start Redpanda Connect
start-connector:
	@./setup.sh start-connector

# Show status of all components
status:
	@./setup.sh status

# Verify all components are working
verify:
	@./setup.sh verify

# Show all logs
logs:
	@./setup.sh logs

# Show PostgreSQL logs
logs-db:
	@./setup.sh logs-db

# Show Redpanda Connect logs
logs-connector:
	@./setup.sh logs-connector

# Stop all services
stop:
	@./setup.sh stop

# Restart all services
restart:
	@./setup.sh restart

# Clean up (remove containers and volumes)
clean:
	@./setup.sh clean

# Quick aliases
up: start
down: stop
ps: status
