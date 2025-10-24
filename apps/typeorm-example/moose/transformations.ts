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

  cliLog({
    action: 'Payload',
    message: JSON.stringify(event.payload),
  });

  const lsn = parseInt(event.metadata.lsn, 16);
  if (event.metadata.operation === 'delete') {
    return {
      ...event.payload,
      is_deleted: 1,
      lsn: lsn,
    } as T & CdcFields;
  }
  return {
    ...event.payload,
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
    switch (cdcEvent.metadata.table) {
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
        throw new Error(`Unknown table: ${cdcEvent.metadata.table}`);
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
