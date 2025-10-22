import { DeadLetterQueue, Stream } from '@514labs/moose-lib';
import {
  CustomerDimension,
  ProductDimension,
  OrderDimension,
  OrderItemFact,
  CdcFields,
  RedpandaPgCdcPayload,
} from './models';
import {
  CustomerDimensionTable,
  ProductDimensionTable,
  OrderItemTable,
  OrderDimensionTable,
} from './sinkTables';

type UnknownEvent = RedpandaPgCdcPayload<Record<string, any>>;

export const UnknownEventDeadLetterTopic = new DeadLetterQueue<UnknownEvent>(
  'unknown_event_dead_letter'
);

export const CustomerDimensionStream = new Stream<CustomerDimension & CdcFields>(
  'customer_dimension',
  {
    destination: CustomerDimensionTable,
  }
);

export const ProductDimensionStream = new Stream<ProductDimension & CdcFields>(
  'product_dimension',
  {
    destination: ProductDimensionTable,
  }
);

export const OrderDimensionStream = new Stream<OrderDimension & CdcFields>('order_dimension', {
  destination: OrderDimensionTable,
});

export const OrderItemStream = new Stream<OrderItemFact & CdcFields>('order_item_fact', {
  destination: OrderItemTable,
});
