from moose.models.models import Customer, Product, Order, OrderItem
from moose_lib import OlapTable, OlapConfig, ReplacingMergeTreeEngine

CustomerTable = OlapTable[Customer](
    name="customer",
    config=OlapConfig(
        order_by_fields=["id"],
        engine=ReplacingMergeTreeEngine(ver="lsn", is_deleted="is_deleted"),
    ),
)

ProductTable = OlapTable[Product](
    name="product",
    config=OlapConfig(
        order_by_fields=["id"],
        engine=ReplacingMergeTreeEngine(ver="lsn", is_deleted="is_deleted"),
    ),
)

OrderTable = OlapTable[Order](
    name="order",
    config=OlapConfig(
        order_by_fields=["id"],
        engine=ReplacingMergeTreeEngine(ver="lsn", is_deleted="is_deleted"),
    ),
)

OrderItemTable = OlapTable[OrderItem](
    name="orderitem",
    config=OlapConfig(
        order_by_fields=["id"],
        engine=ReplacingMergeTreeEngine(ver="lsn", is_deleted="is_deleted"),
    ),
)