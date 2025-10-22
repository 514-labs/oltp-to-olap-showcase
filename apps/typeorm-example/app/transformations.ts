import { TypeormCdcEventsStream } from './sources/externalTopics';
import {
  CustomerDimensionStream,
  ProductDimensionStream,
  OrderDimensionStream,
  OrderItemStream,
  UnknownEventDeadLetterTopic,
} from './sinkTopics';
import {
  CustomerDimension,
  ProductDimension,
  OrderDimension,
  OrderItemFact,
  RedpandaPgCdcPayload,
  CdcFields,
} from './models';
import { cliLog, UInt64 } from '@514labs/moose-lib';

function transformCdcPayload<T>(event: RedpandaPgCdcPayload<T>): T & CdcFields {
  cliLog({
    action: 'CDC Transform',
    message: JSON.stringify(event),
  });

  // Extract payload by destructuring (removes _metadata)
  const { _metadata, ...payload } = event;

  cliLog({
    action: 'Payload',
    message: JSON.stringify(payload),
  });

  const lsn = parseInt(_metadata.lsn, 16);
  if (_metadata.operation === 'delete') {
    return {
      ...payload,
      is_deleted: 1,
      lsn: lsn,
    } as T & CdcFields;
  }
  return {
    ...payload,
    is_deleted: 0,
    lsn: lsn,
  } as T & CdcFields;
}

TypeormCdcEventsStream.addConsumer(
  (event: unknown): void => {
    const cdcEvent = event as RedpandaPgCdcPayload<
      ProductDimension | OrderDimension | OrderItemFact | CustomerDimension
    >;

    let processedPayload;
    switch (cdcEvent._metadata.table) {
      case 'products':
        processedPayload = transformCdcPayload<ProductDimension>(
          cdcEvent as RedpandaPgCdcPayload<ProductDimension>
        );
        ProductDimensionStream.send(processedPayload);
        break;
      case 'customers':
        processedPayload = transformCdcPayload<CustomerDimension>(
          cdcEvent as RedpandaPgCdcPayload<CustomerDimension>
        );
        CustomerDimensionStream.send(processedPayload);
        break;
      case 'orders':
        processedPayload = transformCdcPayload<OrderDimension>(
          cdcEvent as RedpandaPgCdcPayload<OrderDimension>
        );
        OrderDimensionStream.send(processedPayload);
        break;
      case 'order_items':
        processedPayload = transformCdcPayload<OrderItemFact>(
          cdcEvent as RedpandaPgCdcPayload<OrderItemFact>
        );
        OrderItemStream.send(processedPayload);
        break;
      default:
        throw new Error(`Unknown table: ${cdcEvent._metadata.table}`);
    }
  },
  { deadLetterQueue: UnknownEventDeadLetterTopic }
);

CustomerDimensionStream.addConsumer((event: CustomerDimension & CdcFields): void => {
  cliLog({
    action: 'Customer Dimension',
    message: JSON.stringify(event),
  });
});

ProductDimensionStream.addConsumer((event: ProductDimension & CdcFields): void => {
  cliLog({
    action: 'Product Dimension',
    message: JSON.stringify(event),
  });
});

UnknownEventDeadLetterTopic.addConsumer((event: unknown): void => {
  cliLog({
    action: 'Unknown Event',
    message: JSON.stringify(event),
  });
});
const orderItem = { id: 3, orderId: 1, price: 777.88, productId: 1, quantity: 1 };
const order = {
  customerId: 7,
  id: 1,
  orderDate: '2025-10-21T19:33:53.571Z',
  status: 'cancelled',
  total: 4254.39,
};
