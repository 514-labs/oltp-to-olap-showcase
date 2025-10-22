"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderFactStream = exports.OrderDimensionStream = exports.ProductDimensionStream = exports.CustomerDimensionStream = void 0;
const typia_1 = __importDefault(require("typia"));
const moose_lib_1 = require("@514labs/moose-lib");
const destination_tables_1 = require("../destination-tables");
exports.CustomerDimensionStream = new moose_lib_1.Stream('customer_dimension', {
    destination: destination_tables_1.CustomerDimensionTable,
}, {
    version: "3.1",
    components: {
        schemas: {
            UInt64: {
                type: "integer",
                minimum: 0
            }
        }
    },
    schemas: [
        {
            type: "object",
            properties: {
                email: {
                    type: "string"
                },
                name: {
                    type: "string"
                },
                country: {
                    type: "string"
                },
                city: {
                    type: "string"
                },
                createdAt: {
                    type: "string",
                    format: "date-time"
                },
                id: {
                    $ref: "#/components/schemas/UInt64"
                }
            },
            required: [
                "email",
                "name",
                "country",
                "city",
                "createdAt",
                "id"
            ]
        }
    ]
}, JSON.parse("[{\"name\":\"email\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"name\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"country\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"city\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"createdAt\",\"data_type\":\"DateTime\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"id\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]}]"));
exports.ProductDimensionStream = new moose_lib_1.Stream('product_dimension', {
    destination: destination_tables_1.ProductDimensionTable,
}, {
    version: "3.1",
    components: {
        schemas: {
            UInt64: {
                type: "integer",
                minimum: 0
            }
        }
    },
    schemas: [
        {
            type: "object",
            properties: {
                name: {
                    type: "string"
                },
                createdAt: {
                    type: "string",
                    format: "date-time"
                },
                category: {
                    type: "string"
                },
                price: {
                    type: "number"
                },
                id: {
                    $ref: "#/components/schemas/UInt64"
                }
            },
            required: [
                "name",
                "createdAt",
                "category",
                "price",
                "id"
            ]
        }
    ]
}, JSON.parse("[{\"name\":\"name\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"createdAt\",\"data_type\":\"DateTime\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"category\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"price\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"id\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]}]"));
exports.OrderDimensionStream = new moose_lib_1.Stream('order_dimension', {}, {
    version: "3.1",
    components: {
        schemas: {
            UInt64: {
                type: "integer",
                minimum: 0
            }
        }
    },
    schemas: [
        {
            type: "object",
            properties: {
                customerId: {
                    type: "number"
                },
                orderDate: {
                    type: "string",
                    format: "date-time"
                },
                status: {
                    type: "string"
                },
                total: {
                    type: "number"
                },
                id: {
                    $ref: "#/components/schemas/UInt64"
                }
            },
            required: [
                "customerId",
                "orderDate",
                "status",
                "total",
                "id"
            ]
        }
    ]
}, JSON.parse("[{\"name\":\"customerId\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"orderDate\",\"data_type\":\"DateTime\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"status\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"total\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"id\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]}]"));
exports.OrderFactStream = new moose_lib_1.Stream('order_fact', {}, {
    version: "3.1",
    components: {
        schemas: {
            UInt64: {
                type: "integer",
                minimum: 0
            }
        }
    },
    schemas: [
        {
            type: "object",
            properties: {
                id: {
                    $ref: "#/components/schemas/UInt64"
                },
                customerId: {
                    $ref: "#/components/schemas/UInt64"
                },
                productId: {
                    $ref: "#/components/schemas/UInt64"
                },
                orderId: {
                    $ref: "#/components/schemas/UInt64"
                },
                orderDate: {
                    type: "string",
                    format: "date-time"
                },
                quantity: {
                    type: "number"
                },
                unitPrice: {
                    type: "number"
                },
                revenue: {
                    type: "number"
                },
                orderStatus: {
                    type: "string"
                },
                customerCountry: {
                    type: "string"
                },
                customerCity: {
                    type: "string"
                },
                productCategory: {
                    type: "string"
                },
                productName: {
                    type: "string"
                }
            },
            required: [
                "id",
                "customerId",
                "productId",
                "orderId",
                "orderDate",
                "quantity",
                "unitPrice",
                "revenue",
                "orderStatus",
                "customerCountry",
                "customerCity",
                "productCategory",
                "productName"
            ]
        }
    ]
}, JSON.parse("[{\"name\":\"id\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"customerId\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"productId\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"orderId\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"orderDate\",\"data_type\":\"DateTime\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"quantity\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"unitPrice\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"revenue\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"orderStatus\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"customerCountry\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"customerCity\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"productCategory\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"productName\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]}]"));
//# sourceMappingURL=sinkTopics.js.map