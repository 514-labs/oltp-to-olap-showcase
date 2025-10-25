"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderItemStream = exports.OrderDimensionStream = exports.ProductDimensionStream = exports.CustomerDimensionStream = exports.UnknownEventDeadLetterTopic = void 0;
const __typia_transform__assertGuard = __importStar(require("typia/lib/internal/_assertGuard.js"));
const __typia_transform__accessExpressionAsString = __importStar(require("typia/lib/internal/_accessExpressionAsString.js"));
const typia_1 = __importDefault(require("typia"));
const moose_lib_1 = require("@514labs/moose-lib");
const sinkTables_1 = require("./sinkTables");
exports.UnknownEventDeadLetterTopic = new moose_lib_1.DeadLetterQueue('unknown_event_dead_letter', {}, (() => { const _io0 = input => "object" === typeof input.metadata && null !== input.metadata && _io1(input.metadata) && ("object" === typeof input.payload && null !== input.payload && false === Array.isArray(input.payload) && _io2(input.payload)); const _io1 = input => "string" === typeof input.table && ("delete" === input.operation || "insert" === input.operation || "update" === input.operation || "read" === input.operation) && "string" === typeof input.lsn; const _io2 = input => Object.keys(input).every(key => {
    const value = input[key];
    if (undefined === value)
        return true;
    return true;
}); const _ao0 = (input, _path, _exceptionable = true) => (("object" === typeof input.metadata && null !== input.metadata || __typia_transform__assertGuard._assertGuard(_exceptionable, {
    method: "____moose____typia.createAssert",
    path: _path + ".metadata",
    expected: "__type.o1",
    value: input.metadata
}, _errorFactory)) && _ao1(input.metadata, _path + ".metadata", true && _exceptionable) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
    method: "____moose____typia.createAssert",
    path: _path + ".metadata",
    expected: "__type.o1",
    value: input.metadata
}, _errorFactory)) && (("object" === typeof input.payload && null !== input.payload && false === Array.isArray(input.payload) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
    method: "____moose____typia.createAssert",
    path: _path + ".payload",
    expected: "Record<string, any>",
    value: input.payload
}, _errorFactory)) && _ao2(input.payload, _path + ".payload", true && _exceptionable) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
    method: "____moose____typia.createAssert",
    path: _path + ".payload",
    expected: "Record<string, any>",
    value: input.payload
}, _errorFactory)); const _ao1 = (input, _path, _exceptionable = true) => ("string" === typeof input.table || __typia_transform__assertGuard._assertGuard(_exceptionable, {
    method: "____moose____typia.createAssert",
    path: _path + ".table",
    expected: "string",
    value: input.table
}, _errorFactory)) && ("delete" === input.operation || "insert" === input.operation || "update" === input.operation || "read" === input.operation || __typia_transform__assertGuard._assertGuard(_exceptionable, {
    method: "____moose____typia.createAssert",
    path: _path + ".operation",
    expected: "(\"delete\" | \"insert\" | \"read\" | \"update\")",
    value: input.operation
}, _errorFactory)) && ("string" === typeof input.lsn || __typia_transform__assertGuard._assertGuard(_exceptionable, {
    method: "____moose____typia.createAssert",
    path: _path + ".lsn",
    expected: "string",
    value: input.lsn
}, _errorFactory)); const _ao2 = (input, _path, _exceptionable = true) => false === _exceptionable || Object.keys(input).every(key => {
    const value = input[key];
    if (undefined === value)
        return true;
    return true;
}); const __is = input => "object" === typeof input && null !== input && _io0(input); let _errorFactory; return (input, errorFactory) => {
    if (false === __is(input)) {
        _errorFactory = errorFactory;
        ((input, _path, _exceptionable = true) => ("object" === typeof input && null !== input || __typia_transform__assertGuard._assertGuard(true, {
            method: "____moose____typia.createAssert",
            path: _path + "",
            expected: "__type",
            value: input
        }, _errorFactory)) && _ao0(input, _path + "", true) || __typia_transform__assertGuard._assertGuard(true, {
            method: "____moose____typia.createAssert",
            path: _path + "",
            expected: "__type",
            value: input
        }, _errorFactory))(input, "$input", true);
    }
    return input;
}; })());
exports.CustomerDimensionStream = new moose_lib_1.Stream('customer_dimension', {
    destination: sinkTables_1.CustomerDimensionTable,
}, {
    version: "3.1",
    components: {
        schemas: {
            UInt64: {
                type: "integer",
                minimum: 0
            },
            UInt8: {
                type: "integer"
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
                },
                is_deleted: {
                    $ref: "#/components/schemas/UInt8"
                },
                lsn: {
                    $ref: "#/components/schemas/UInt64"
                }
            },
            required: [
                "email",
                "name",
                "country",
                "city",
                "createdAt",
                "id",
                "is_deleted",
                "lsn"
            ]
        }
    ]
}, JSON.parse("[{\"name\":\"email\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"name\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"country\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"city\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"createdAt\",\"data_type\":\"DateTime\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"id\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"is_deleted\",\"data_type\":\"UInt8\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"lsn\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]}]"));
exports.ProductDimensionStream = new moose_lib_1.Stream('product_dimension', {
    destination: sinkTables_1.ProductDimensionTable,
}, {
    version: "3.1",
    components: {
        schemas: {
            UInt64: {
                type: "integer",
                minimum: 0
            },
            UInt8: {
                type: "integer"
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
                },
                is_deleted: {
                    $ref: "#/components/schemas/UInt8"
                },
                lsn: {
                    $ref: "#/components/schemas/UInt64"
                }
            },
            required: [
                "name",
                "createdAt",
                "category",
                "price",
                "id",
                "is_deleted",
                "lsn"
            ]
        }
    ]
}, JSON.parse("[{\"name\":\"name\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"createdAt\",\"data_type\":\"DateTime\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"category\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"price\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"id\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"is_deleted\",\"data_type\":\"UInt8\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"lsn\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]}]"));
exports.OrderDimensionStream = new moose_lib_1.Stream('order_dimension', {
    destination: sinkTables_1.OrderDimensionTable,
}, {
    version: "3.1",
    components: {
        schemas: {
            UInt64: {
                type: "integer",
                minimum: 0
            },
            UInt8: {
                type: "integer"
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
                },
                is_deleted: {
                    $ref: "#/components/schemas/UInt8"
                },
                lsn: {
                    $ref: "#/components/schemas/UInt64"
                }
            },
            required: [
                "customerId",
                "orderDate",
                "status",
                "total",
                "id",
                "is_deleted",
                "lsn"
            ]
        }
    ]
}, JSON.parse("[{\"name\":\"customerId\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"orderDate\",\"data_type\":\"DateTime\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"status\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"total\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"id\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"is_deleted\",\"data_type\":\"UInt8\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"lsn\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]}]"));
exports.OrderItemStream = new moose_lib_1.Stream('order_item_fact', {
    destination: sinkTables_1.OrderItemTable,
}, {
    version: "3.1",
    components: {
        schemas: {
            UInt64: {
                type: "integer",
                minimum: 0
            },
            UInt8: {
                type: "integer"
            }
        }
    },
    schemas: [
        {
            type: "object",
            properties: {
                price: {
                    type: "number"
                },
                orderId: {
                    type: "number"
                },
                productId: {
                    type: "number"
                },
                quantity: {
                    type: "number"
                },
                id: {
                    $ref: "#/components/schemas/UInt64"
                },
                is_deleted: {
                    $ref: "#/components/schemas/UInt8"
                },
                lsn: {
                    $ref: "#/components/schemas/UInt64"
                }
            },
            required: [
                "price",
                "orderId",
                "productId",
                "quantity",
                "id",
                "is_deleted",
                "lsn"
            ]
        }
    ]
}, JSON.parse("[{\"name\":\"price\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"orderId\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"productId\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"quantity\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"id\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"is_deleted\",\"data_type\":\"UInt8\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"lsn\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]}]"));
//# sourceMappingURL=sinkTopics.js.map