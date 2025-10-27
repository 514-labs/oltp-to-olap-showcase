from moose.models.models import Customer, Product, Order, OrderItem
from moose_lib import Stream

# Dimension Streams
CustomerStream = Stream[Customer](
    name='customer'
)

ProductStream = Stream[Product](
    name='product',
)

OrderStream = Stream[Order](
    name='order',
)

OrderItemStream = Stream[OrderItem](
    name='orderitem',
)