"""
CDC Event Transformations

Converts Redpanda Connect CDC events to OLAP format:
- Extracts _metadata
- Adds is_deleted flag
- Converts LSN from hex to integer
- Routes events by table name to appropriate dimension/fact streams
"""

from typing import Dict, Any, TypeVar, Generic, Union, cast
from moose_lib import Logger, ConsumerConfig
from app.models import (
    CustomerDimension,
    ProductDimension,
    OrderDimension,
    OrderItemFact,
    RedpandaPgCdcPayload,
    CdcFields,
)
from app.sources.external_topics import SqlAlchemyCdcEventsStream
from app.sinks.topics import (
    CustomerDimensionStream,
    ProductDimensionStream,
    OrderDimensionStream,
    OrderItemStream,
    UnknownEventDeadLetterTopic,
)


T = TypeVar('T', bound=CdcFields)


def transform_cdc_payload(event: RedpandaPgCdcPayload[T], target_model: type[T]) -> T:
    """
    Transform CDC event payload to a typed OLAP model.
    
    Performs:
    1. Extracts _metadata
    2. Converts LSN from hex string to integer
    3. Adds is_deleted flag based on operation type
    4. Returns typed instance of target model
    
    Args:
        event: CDC event with _metadata and table fields
        target_model: Target dimension/fact model class
        
    Returns:
        Typed instance with CDC fields populated
    """
    logger = Logger("CDC Transform")
    logger.info(f"{event}")
    
    # Extract metadata
    metadata = event._metadata
    operation = metadata.operation
    lsn_hex = metadata.lsn
    
    # Convert LSN from hex to integer
    lsn = int(lsn_hex, 16) if lsn_hex else 0
    
    # Get all fields except _metadata
    payload_dict = event.model_dump(exclude={'_metadata'})
    
    logger.info(f"{payload_dict}")
    
    # Add CDC fields
    payload_dict['is_deleted'] = 1 if operation == 'delete' else 0
    payload_dict['lsn'] = lsn
    
    # Return typed model instance
    return target_model(**payload_dict)


def process_cdc_events(event: RedpandaPgCdcPayload[Any]) -> None:
    """
    Main CDC event processor
    
    Routes events from the sqlalchemy_cdc_events topic to appropriate
    dimension/fact streams based on the table name in metadata.
    """
    logger = Logger("CDC Process")
    
    # Determine table from metadata
    metadata = event._metadata
    table_name = metadata.table
    
    try:
        if table_name == 'products':
            processed = transform_cdc_payload(event, ProductDimension)
            logger.info(f"{processed}")
            ProductDimensionStream.send(processed)
            
        elif table_name == 'customers':
            typed_event = cast(RedpandaPgCdcPayload[CustomerDimension], event)
            processed = transform_cdc_payload(typed_event, CustomerDimension)
            logger.info(f"{processed}")
            CustomerDimensionStream.send(processed)
            
        elif table_name == 'orders':
            typed_event = cast(RedpandaPgCdcPayload[OrderDimension], event)
            processed = transform_cdc_payload(typed_event, OrderDimension)
            logger.info(f"{processed}")
            OrderDimensionStream.send(processed)
            
        elif table_name == 'order_items':
            typed_event = cast(RedpandaPgCdcPayload[OrderItemFact], event)
            processed = transform_cdc_payload(typed_event, OrderItemFact)
            logger.info(f"{processed}")
            OrderItemStream.send(processed)
            
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
