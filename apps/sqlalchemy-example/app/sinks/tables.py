"""
ClickHouse Table Definitions

These tables receive data from CDC streams using ReplacingMergeTree engine
for automatic deduplication based on LSN versioning.
"""

from moose_lib import OlapTable, OlapConfig, ReplacingMergeTreeEngine
from app.models import (
    CustomerDimension,
    ProductDimension,
    OrderDimension,
    OrderItemFact,
    OrderFact,
)


# ==================== DIMENSION TABLES ====================

CustomerDimensionTable = OlapTable[CustomerDimension](
    name="dim_customer",
    config=OlapConfig(
        order_by_fields=["id"],
        engine=ReplacingMergeTreeEngine(ver="lsn", is_deleted="is_deleted"),
    ),
)

ProductDimensionTable = OlapTable[ProductDimension](
    name="dim_product",
    config=OlapConfig(
        order_by_fields=["id"],
        engine=ReplacingMergeTreeEngine(ver="lsn", is_deleted="is_deleted"),
    ),
)

OrderDimensionTable = OlapTable[OrderDimension](
    name="dim_order",
    config=OlapConfig(
        order_by_fields=["id"],
        engine=ReplacingMergeTreeEngine(ver="lsn", is_deleted="is_deleted"),
    ),
)


# ==================== FACT TABLE ====================

OrderItemTable = OlapTable[OrderItemFact](
    name="fact_order_item",
    config=OlapConfig(
        order_by_fields=["id", "order_id", "product_id"],
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
