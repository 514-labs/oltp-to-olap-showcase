"""
CDC Event Transformations

Converts Redpanda Connect CDC events to OLAP format:
- Extracts _metadata
- Adds is_deleted flag
- Converts LSN from hex to integer
- Routes events by table name to appropriate dimension/fact streams
"""

from typing import Dict, Any, TypeVar, Generic
from moose_lib import Logger, ConsumerConfig
from app.models import (
    CustomerDimension,
    ProductDimension,
    OrderDimension,
    OrderItemFact,
    RedpandaPgCdcPayload,
)
from app.sources.external_topics import SqlAlchemyCdcEventsStream
from app.sinks.topics import (
    CustomerDimensionStream,
    ProductDimensionStream,
    OrderDimensionStream,
    OrderItemStream,
    UnknownEventDeadLetterTopic,
)


T = TypeVar('T')


def transform_cdc_payload(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform CDC event payload by:
    1. Extracting _metadata
    2. Converting LSN from hex string to integer
    3. Adding is_deleted flag based on operation type
    
    Args:
        event: Raw CDC event with _metadata field
        
    Returns:
        Transformed payload with CDC fields
    """
    logger = Logger("CDC Transform")
    logger.info(f"{event}")
    
    # Extract metadata
    metadata = event.get('_metadata', {})
    operation = metadata.get('operation', 'insert')
    lsn_hex = metadata.get('lsn', '0')
    
    # Convert LSN from hex to integer
    lsn = int(lsn_hex, 16) if lsn_hex else 0
    
    # Remove metadata from payload
    payload = {k: v for k, v in event.items() if k != '_metadata'}
    
    logger.info(f"{payload}")
    
    # Add CDC fields
    payload['is_deleted'] = 1 if operation == 'delete' else 0
    payload['lsn'] = lsn
    
    return payload


def process_cdc_events(event: Any) -> None:
    """
    Main CDC event processor
    
    Routes events from the sqlalchemy_cdc_events topic to appropriate
    dimension/fact streams based on the table name in metadata.
    """
    logger = Logger("CDC Process")
    
    cdc_event = event
    
    # Determine table and route to appropriate stream
    metadata = cdc_event.get('_metadata', {})
    table_name = metadata.get('table', '')
    
    try:
        processed_payload = transform_cdc_payload(cdc_event)
        
        if table_name == 'products':
            logger.info(f"{processed_payload}")
            ProductDimensionStream.send(ProductDimension(**processed_payload))
            
        elif table_name == 'customers':
            logger.info(f"{processed_payload}")
            CustomerDimensionStream.send(CustomerDimension(**processed_payload))
            
        elif table_name == 'orders':
            logger.info(f"{processed_payload}")
            OrderDimensionStream.send(OrderDimension(**processed_payload))
            
        elif table_name == 'order_items':
            logger.info(f"{processed_payload}")
            OrderItemStream.send(OrderItemFact(**processed_payload))
            
        else:
            raise ValueError(f"Unknown table: {table_name}")
            
    except Exception as e:
        logger.error(f"Failed to process event: {str(e)}")
        raise


# Register the consumer
SqlAlchemyCdcEventsStream.add_consumer(
    process_cdc_events,
    config=ConsumerConfig(
        dead_letter_queue=UnknownEventDeadLetterTopic,
    )
)


# Additional consumers for logging
def log_customer_dimension(event: CustomerDimension) -> None:
    """Log customer dimension events"""
    logger = Logger("Customer Dimension")
    logger.info(f"{event}")


def log_product_dimension(event: ProductDimension) -> None:
    """Log product dimension events"""
    logger = Logger("Product Dimension")
    logger.info(f"{event}")


def log_unknown_event(event: Any) -> None:
    """Log unknown/failed events"""
    logger = Logger("Unknown Event")
    logger.info(f"{event}")


# Register logging consumers
CustomerDimensionStream.add_consumer(log_customer_dimension)
ProductDimensionStream.add_consumer(log_product_dimension)
UnknownEventDeadLetterTopic.add_consumer(log_unknown_event)
