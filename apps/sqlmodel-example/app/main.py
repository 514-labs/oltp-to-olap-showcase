from pydantic import BaseModel
from datetime import datetime
from typing import Annotated, Literal, Generic, TypeVar, Any
from moose_lib import Stream, StreamConfig
from moose_lib import OlapTable, OlapConfig, ReplacingMergeTreeEngine, Logger, DeadLetterQueue, ConsumerConfig
from decimal import Decimal

# ==================== CDC MODELS ====================
T = TypeVar('T', bound=BaseModel)

class CdcMetadata(BaseModel):
    """CDC metadata from Redpanda Connect"""
    table: str
    operation: Literal['insert', 'update', 'delete']
    lsn: str

class RawCdcPayload(BaseModel):
    """Raw CDC payload from Redpanda Connect"""
    metadata: CdcMetadata
    payload: Any


CdcEventStream = Stream[RawCdcPayload](
    name='sqlmodel_cdc_events'
)


class CdcFields(BaseModel):
    """CDC metadata fields added to all OLAP tables"""
    is_deleted: Annotated[int, "uint8"]  # UInt8: 0 = active, 1 = deleted
    lsn: int  # UInt64: PostgreSQL log sequence number


# ==================== CUSTOMER PIPELINE ====================

class Customer(CdcFields, BaseModel):
    """Customer Dimension - Converted from SQLAlchemy Customer model"""
    id: int
    email: str
    name: str
    country: str
    city: str
    createdAt: datetime
    

class Product(CdcFields, BaseModel):
    """Product Dimension - Converted from SQLAlchemy Product model"""
    id: int
    name: str
    category: str
    price: Decimal
    createdAt: datetime


class Order(CdcFields, BaseModel):
    """Order Dimension - Converted from SQLAlchemy Order model"""
    id: int
    customerId: int
    orderDate: datetime
    status: str
    total: Decimal


class OrderItem(CdcFields, BaseModel):
    """OrderItem Fact - Converted from SQLAlchemy OrderItem model"""
    id: int
    orderId: int
    productId: int
    quantity: int
    price: Decimal


# ==================== ENRICHED FACT TABLE ====================

class OrderFact(CdcFields, BaseModel):
    """
    Order Fact Enriched
    Denormalized fact table with dimension attributes
    
    Created by joining OrderItem with dimension tables via dictionaries:
    - Customer attributes (country, city)
    - Product attributes (category, name)
    - Order attributes (date, status)
    """
    id: int  # OrderItem ID
    order_id: int
    product_id: int
    customer_id: int
    
    # Time dimension
    order_date: datetime
    
    # Measures
    quantity: int
    unit_price: float
    revenue: float  # Calculated: quantity * unit_price
    
    # Denormalized attributes from dimensions
    order_status: str  # From Order
    customer_country: str  # From Customer
    customer_city: str  # From Customer
    product_category: str  # From Product
    product_name: str  # From Product

# ============================================================================
# DESTINATIONS
# ============================================================================
# ClickHouse tables (dimensions and facts)
CustomerTable = OlapTable[Customer](
    name="dim_customer",
    config=OlapConfig(
        order_by_fields=["id"],
        engine=ReplacingMergeTreeEngine(ver="lsn", is_deleted="is_deleted"),
    ),
)

ProductTable = OlapTable[Product](
    name="dim_product",
    config=OlapConfig(
        order_by_fields=["id"],
        engine=ReplacingMergeTreeEngine(ver="lsn", is_deleted="is_deleted"),
    ),
)

OrderTable = OlapTable[Order](
    name="dim_order",
    config=OlapConfig(
        order_by_fields=["id"],
        engine=ReplacingMergeTreeEngine(ver="lsn", is_deleted="is_deleted"),
    ),
)

OrderItemTable = OlapTable[OrderItem](
    name="fact_order_item",
    config=OlapConfig(
        order_by_fields=["id", "orderId", "productId"],
        engine=ReplacingMergeTreeEngine(ver="lsn", is_deleted="is_deleted"),
    ),
)


OrderFactTable = OlapTable[OrderFact](
    name="fact_order",
    config=OlapConfig(
        order_by_fields=["order_date", "customer_id", "product_id"],
        engine=ReplacingMergeTreeEngine(ver="lsn", is_deleted="is_deleted"),
    ),
)


# Dead Letter Queue for unknown events
UnknownEventDeadLetterTopic = DeadLetterQueue[RawCdcPayload](
    name='unknown_event_dead_letter'
)


# Dimension Streams
CustomerStream = Stream[Customer](
    name='customer',
    config=StreamConfig(
        destination=CustomerTable,
    )
)

ProductStream = Stream[Product](
    name='product',
    config=StreamConfig(
        destination=ProductTable,
    )
)

OrderStream = Stream[Order](
    name='order',
    config=StreamConfig(
        destination=OrderTable,
    )
)

OrderItemStream = Stream[OrderItem](
    name='order_item',
    config=StreamConfig(
        destination=OrderItemTable,
    )
)

# import app.transformations as transformations
## to reproduce the bug, uncomment the following line 
# sources.SqlAlchemyCdcEventsStream.add_consumer(lambda event: Logger("CDC Events").info(f"{event}"))

# ============================================================================
# TRANSFORMATIONS
# ============================================================================
# Stream processing logic that transforms CDC events to OLAP format

def transform_cdc_payload(event: RawCdcPayload) -> Any:
    """
    Transform CDC event payload by:
    1. Extracting _metadata and payload
    2. Converting LSN from hex string to integer
    3. Adding is_deleted flag based on operation type
    
    Args:
        event: Raw CDC event with _metadata and payload fields
        
    Returns:
        Transformed payload with CDC fields
    """
    logger = Logger("CDC Transform")
    logger.info(f"Raw event: {event}")
    
    # Extract metadata and payload
    operation = event.metadata.operation
    lsn = event.metadata.lsn
    
    high, low = lsn.split('/')
    lsn = (int(high, 16) << 32) | int(low, 16)
    
    # Get the actual data from the payload field
    payload_data = event.payload
    payload_data['is_deleted'] = 1 if operation == 'delete' else 0
    payload_data['lsn'] = lsn
    
    logger.info(f"Payload data: {payload_data}")
    return payload_data


def process_cdc_events(event: RawCdcPayload) -> None:
    """
    Main CDC event processor
    
    Routes events from the sqlmodel_cdc_events topic to appropriate
    dimension/fact streams based on the table name in metadata.
    """
    logger = Logger("CDC Process")
    logger.info(f"Processing CDC event: {event}")
    
    event = RawCdcPayload.model_validate(event)
    logger.info(f"Validated event: {event}")
    try:
        # Extract metadata to determine table and operation
        table_name = event.metadata.table
        
        logger.info(f"Processing {event.metadata.operation} operation on table: {table_name}")
        
        # Transform the payload
        processed_payload = transform_cdc_payload(event)
        
        # Route to appropriate stream based on table name
        if table_name == 'product':
            logger.info(f"Sending to ProductStream: {processed_payload}")
            ProductStream.send(Product(**processed_payload))
            
        elif table_name == 'customer':
            logger.info(f"Sending to CustomerStream: {processed_payload}")
            CustomerStream.send(Customer(**processed_payload))
            
        elif table_name == 'order':
            logger.info(f"Sending to OrderStream: {processed_payload}")
            OrderStream.send(Order(**processed_payload))
            
        elif table_name == 'orderitem':
            logger.info(f"Sending to OrderItemStream: {processed_payload}")
            OrderItemStream.send(OrderItem(**processed_payload))
            
        else:
            logger.info(f"Unknown table: {table_name}")
            raise ValueError(f"Unknown table: {table_name}")
            
    except Exception as e:
        logger.error(f"Failed to process event: {str(e)}")
        logger.error(f"Event that failed: {event}")
        raise


CdcEventStream.add_consumer(process_cdc_events, config=ConsumerConfig(dead_letter_queue=UnknownEventDeadLetterTopic))

# # Additional consumers for logging
def log_customer_dimension(event) -> None:
    """Log customer dimension events"""
    logger = Logger("[CDC] Customer")
    logger.info(f"{event}")


def log_product_dimension(event) -> None:
    """Log product dimension events"""
    logger = Logger("[CDC] Product")
    logger.info(f"{event}")


def log_unknown_event(event: Any) -> None:
    """Log unknown/failed events"""
    logger = Logger("Unknown Event")
    logger.info(f"{event}")


# # Register logging consumers
CustomerStream.add_consumer(log_customer_dimension)
ProductStream.add_consumer(log_product_dimension)
UnknownEventDeadLetterTopic.add_consumer(log_unknown_event)
