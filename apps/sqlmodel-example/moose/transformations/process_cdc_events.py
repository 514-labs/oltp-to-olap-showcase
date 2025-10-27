"""
CDC Event Processing - Dynamic Routing

Scalable CDC event processing using registry-based stream lookup.

Dynamic Routing Pattern:
- Uses get_stream(table_name) for registry-based lookup
- No hardcoded table names or if/elif chains
- Scales to hundreds of tables without code changes
- Add new tables by defining them in sinks/tables.py and sinks/streams.py

Flow: PostgreSQL → Redpanda Connect → Transform → get_stream() → ClickHouse table
"""

from moose.models.models import RawCdcPayload
from moose_lib import Logger, get_stream
from typing import Any


def transform_cdc_payload(event: RawCdcPayload) -> dict:
    """
    Transform CDC event to OLAP format.

    Steps:
    1. Convert LSN from hex string ("0/1234ABC") to 64-bit int for ReplacingMergeTree
    2. Add is_deleted flag (0=insert/update, 1=delete)
    3. Preserve payload (None values handled by Pydantic model defaults)
    """
    logger = Logger("CDC Transform")
    operation = event.metadata.operation
    table_name = event.metadata.table
    lsn = event.metadata.lsn

    logger.info(f"Transforming {operation} on {table_name}")

    # Convert LSN: "0/1A2B3C4" → (0 << 32) | 0x1A2B3C4
    high, low = lsn.split('/')
    lsn_int = (int(high, 16) << 32) | int(low, 16)

    payload_data = event.payload.copy() if isinstance(event.payload, dict) else {}

    # Add CDC fields for ReplacingMergeTree
    payload_data['is_deleted'] = 1 if operation == 'delete' else 0
    payload_data['lsn'] = lsn_int

    return payload_data


def process_cdc_events(event: RawCdcPayload) -> None:
    """
    Main CDC processor with dynamic routing.

    Flow:
    1. Transform payload (add CDC fields, convert LSN)
    2. Lookup stream using get_stream(table_name) from registry
    3. Instantiate model (Pydantic handles None→default for delete events)
    4. Send to stream → routed to OLAP table

    IMPORTANT: Stream names must match CDC event table names.
    """
    logger = Logger("CDC Process")

    try:
        table_name = event.metadata.table
        operation = event.metadata.operation
        logger.info(f"Processing {operation} on '{table_name}'")

        processed_payload = transform_cdc_payload(event)

        # Dynamic routing via registry lookup (no hardcoded if/elif chains)
        stream = get_stream(table_name)
        if not stream:
            raise ValueError(f"No stream configured for table: {table_name}")

        # Instantiate model (Pydantic applies defaults for None values)
        model_class = stream.model_type
        model_instance = model_class(**processed_payload)

        stream.send(model_instance)
        logger.info(f"Successfully routed to stream: {stream.name}")

    except Exception as e:
        logger.error(f"Failed to process CDC event: {e}")
        raise

# ══════════════════════════════════════════════════════════════
# Stream Consumers for Monitoring
# ══════════════════════════════════════════════════════════════

def log_customer_dimension(event) -> None:
    """Log customer events routed to OLAP table."""
    logger = Logger("[CDC] Customer")
    logger.info(f"{event}")


def log_product_dimension(event) -> None:
    """Log product events routed to OLAP table."""
    logger = Logger("[CDC] Product")
    logger.info(f"{event}")


def log_unknown_event(event: Any) -> None:
    """Log failed events sent to dead letter queue (unknown tables, validation errors)."""
    logger = Logger("Dead Letter Queue")
    logger.info(f"{event}")

