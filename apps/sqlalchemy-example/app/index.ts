/**
 * Moose OLAP Application for SQLAlchemy CDC Pipeline
 *
 * This module exports the complete CDC pipeline configuration:
 * - Source topics (Redpanda CDC events from PostgreSQL)
 * - Transformations (SQLAlchemy OLTP → OLAP conversion)
 * - Sink topics/tables (ClickHouse destinations)
 */

// ============================================================================
// DATA SOURCES
// ============================================================================
// External Kafka topics that bring in CDC events from PostgreSQL
export * from './sources/externalTopics';

// ============================================================================
// TRANSFORMATIONS
// ============================================================================
// Stream processing logic that transforms CDC events to OLAP format
export * from './transformations';

// ============================================================================
// DESTINATIONS
// ============================================================================
// Sink topics (intermediate streams) and tables (ClickHouse tables)
export * from './sinkTopics';
export * from './sinkTables';
