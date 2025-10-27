from moose_lib import ConsumerConfig

"""
Moose Main Application
"""


# ==================== CDC STREAM ====================
from moose.sources.cdc_event_steam import CdcEventStream, UnknownEventDeadLetterTopic

# ============================================================================
# DESTINATIONS
# ============================================================================
from moose.sinks.tables import CustomerTable, ProductTable, OrderTable, OrderItemTable
from moose.sinks.streams import CustomerStream, ProductStream, OrderStream, OrderItemStream

CustomerStream.config.destination = CustomerTable
ProductStream.config.destination = ProductTable
OrderStream.config.destination = OrderTable
OrderItemStream.config.destination = OrderItemTable

# ============================================================================
# TRANSFORMATIONS
# ============================================================================
# Stream processing logic that transforms CDC events to OLAP format
from moose.transformations.process_cdc_events import process_cdc_events, log_customer_dimension, log_product_dimension, log_unknown_event


CdcEventStream.add_consumer(process_cdc_events, config=ConsumerConfig(dead_letter_queue=UnknownEventDeadLetterTopic))
CustomerStream.add_consumer(log_customer_dimension)
ProductStream.add_consumer(log_product_dimension)
UnknownEventDeadLetterTopic.add_consumer(log_unknown_event)