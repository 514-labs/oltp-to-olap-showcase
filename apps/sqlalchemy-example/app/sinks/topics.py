"""
Kafka/Redpanda Sink Topics

These streaming topics connect CDC events to ClickHouse tables.
Each dimension/fact has a dedicated stream that auto-writes to its destination table.
"""

from moose_lib import DeadLetterQueue, StreamConfig, Stream
from app.models import (
    CustomerDimension,
    ProductDimension,
    OrderDimension,
    OrderItemFact,
    RedpandaPgCdcPayload,
)
from app.sinks.tables import (
    CustomerDimensionTable,
    ProductDimensionTable,
    OrderDimensionTable,
    OrderItemTable,
)


# Dead Letter Queue for unknown events
UnknownEventDeadLetterTopic = DeadLetterQueue[RedpandaPgCdcPayload](
    name='unknown_event_dead_letter'
)


# Dimension Streams
CustomerDimensionStream = Stream[CustomerDimension](
    name='customer_dimension',
    config=StreamConfig(
        destination=CustomerDimensionTable,
    )
)

ProductDimensionStream = Stream[ProductDimension](
    name='product_dimension',
    config=StreamConfig(
        destination=ProductDimensionTable,
    )
)

OrderDimensionStream = Stream[OrderDimension](
    name='order_dimension',
    config=StreamConfig(
        destination=OrderDimensionTable,
    )
)

# Fact Stream
OrderItemStream = Stream[OrderItemFact](
    name='order_item_fact',
    config=StreamConfig(
        destination=OrderItemTable,
    )
)
