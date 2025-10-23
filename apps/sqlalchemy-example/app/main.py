"""
Moose OLAP Application for SQLAlchemy CDC Pipeline

This module exports the complete CDC pipeline configuration:
- Data models (OLAP schemas)
- Source topics (Redpanda CDC events from PostgreSQL)
- Transformations (SQLAlchemy OLTP → OLAP conversion)
- Sink tables (ClickHouse destinations)

The Moose framework automatically discovers and registers all:
- @moose_data_model decorated classes
- @streaming_function decorated functions
- Aggregation table definitions
"""

# ============================================================================
# DATA MODELS
# ============================================================================
# OLAP schemas for dimension and fact tables
from app.models import (
    CustomerDimension,
    ProductDimension,
    OrderDimension,
    OrderItemFact,
    OrderFact,
    CdcFields,
    RedpandaPgCdcPayload,
)

# ============================================================================
# DATA SOURCES
# ============================================================================
# External Kafka topics that bring in CDC events from PostgreSQL
from app.sources.external_topics import SqlAlchemyCdcEventsStream

# # # ============================================================================
# # # TRANSFORMATIONS
# # # ============================================================================
# # # Stream processing logic that transforms CDC events to OLAP format
# from moose.transformations import (
#     process_cdc_events,
#     log_customer_dimension,
#     log_product_dimension,
#     log_unknown_event,
# )

# ============================================================================
# DESTINATIONS
# ============================================================================
# ClickHouse tables (dimensions and facts)
from app.sinks.tables import (
    CustomerDimensionTable,
    ProductDimensionTable,
    OrderDimensionTable,
    OrderItemTable,
)

from app.sinks.topics import (
    CustomerDimensionStream,
    ProductDimensionStream,
    OrderDimensionStream,
    OrderItemStream,
    UnknownEventDeadLetterTopic,
)

