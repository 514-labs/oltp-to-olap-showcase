"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const externalTopics_1 = require("./sources/externalTopics");
const sinkTopics_1 = require("./sinkTopics");
const moose_lib_1 = require("@514labs/moose-lib");
function transformCdcPayload(event) {
    (0, moose_lib_1.cliLog)({
        action: 'CDC Transform',
        message: JSON.stringify(event),
    });
    const { _metadata, ...payload } = event;
    (0, moose_lib_1.cliLog)({
        action: 'Payload',
        message: JSON.stringify(payload),
    });
    const lsn = parseInt(_metadata.lsn, 16);
    if (_metadata.operation === 'delete') {
        return {
            ...payload,
            is_deleted: 1,
            lsn: lsn,
        };
    }
    return {
        ...payload,
        is_deleted: 0,
        lsn: lsn,
    };
}
externalTopics_1.TypeormCdcEventsStream.addConsumer((event) => {
    const cdcEvent = event;
    let processedPayload;
    switch (cdcEvent._metadata.table) {
        case 'products':
            processedPayload = transformCdcPayload(cdcEvent);
            sinkTopics_1.ProductDimensionStream.send(processedPayload);
            break;
        case 'customers':
            processedPayload = transformCdcPayload(cdcEvent);
            sinkTopics_1.CustomerDimensionStream.send(processedPayload);
            break;
        case 'orders':
            processedPayload = transformCdcPayload(cdcEvent);
            sinkTopics_1.OrderDimensionStream.send(processedPayload);
            break;
        case 'order_items':
            processedPayload = transformCdcPayload(cdcEvent);
            sinkTopics_1.OrderItemStream.send(processedPayload);
            break;
        default:
            throw new Error(`Unknown table: ${cdcEvent._metadata.table}`);
    }
}, { deadLetterQueue: sinkTopics_1.UnknownEventDeadLetterTopic });
sinkTopics_1.CustomerDimensionStream.addConsumer((event) => {
    (0, moose_lib_1.cliLog)({
        action: 'Customer Dimension',
        message: JSON.stringify(event),
    });
});
sinkTopics_1.ProductDimensionStream.addConsumer((event) => {
    (0, moose_lib_1.cliLog)({
        action: 'Product Dimension',
        message: JSON.stringify(event),
    });
});
sinkTopics_1.UnknownEventDeadLetterTopic.addConsumer((event) => {
    (0, moose_lib_1.cliLog)({
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
//# sourceMappingURL=transformations.js.map