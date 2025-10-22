/**
 * CDC Event Transformations
 *
 * Converts Redpanda Connect CDC events to OLAP format:
 * - Extracts _metadata
 * - Adds is_deleted flag
 * - Converts LSN to UInt64
 * - Routes events by table name
 */

import { SqlAlchemyCdcEventsStream } from './sources/externalTopics';
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

SqlAlchemyCdcEventsStream.addConsumer(
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
        cliLog({
          action: 'Product Dimension',
          message: JSON.stringify(processedPayload),
        });
        ProductDimensionStream.send(processedPayload);
        break;
      case 'customers':
        processedPayload = transformCdcPayload<CustomerDimension>(
          cdcEvent as RedpandaPgCdcPayload<CustomerDimension>
        );
        cliLog({
          action: 'Customer Dimension',
          message: JSON.stringify(processedPayload),
        });
        CustomerDimensionStream.send(processedPayload);
        break;
      case 'orders':
        processedPayload = transformCdcPayload<OrderDimension>(
          cdcEvent as RedpandaPgCdcPayload<OrderDimension>
        );
        cliLog({
          action: 'Order Dimension',
          message: JSON.stringify(processedPayload),
        });
        OrderDimensionStream.send(processedPayload);
        break;
      case 'order_items':
        processedPayload = transformCdcPayload<OrderItemFact>(
          cdcEvent as RedpandaPgCdcPayload<OrderItemFact>
        );
        cliLog({
          action: 'Order Item',
          message: JSON.stringify(processedPayload),
        });
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
