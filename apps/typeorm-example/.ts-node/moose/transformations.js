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
    (0, moose_lib_1.cliLog)({
        action: 'Payload',
        message: JSON.stringify(event.payload),
    });
    const lsn = parseInt(event.metadata.lsn, 16);
    if (event.metadata.operation === 'delete') {
        return {
            ...event.payload,
            is_deleted: 1,
            lsn: lsn,
        };
    }
    return {
        ...event.payload,
        is_deleted: 0,
        lsn: lsn,
    };
}
externalTopics_1.TypeormCdcEventsStream.addConsumer((event) => {
    const cdcEvent = event;
    let processedPayload;
    switch (cdcEvent.metadata.table) {
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
            throw new Error(`Unknown table: ${cdcEvent.metadata.table}`);
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
//# sourceMappingURL=transformations.js.map