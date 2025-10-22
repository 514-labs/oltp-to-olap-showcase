/**
 * Moose OLAP Application
 *
 * This module exports the complete CDC pipeline configuration:
 * - Source topics (Redpanda CDC events)
 * - Transformations (OLTP → OLAP conversion)
 * - Sink topics/tables (ClickHouse destinations)
 * - Materialized views (enrichment layer)
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
// ============================================================================
// ENRICHMENT
// ============================================================================
// Materialized views and dictionaries for enriching fact tables
export * from './materializedViews';
