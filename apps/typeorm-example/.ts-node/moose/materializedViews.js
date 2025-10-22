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
exports.OrderFactEnrichedView = exports.JoinedOrders = exports.dictOrders = exports.dictProducts = exports.dictCustomers = void 0;
const __typia_transform__isTypeUint64 = __importStar(require("typia/lib/internal/_isTypeUint64.js"));
const __typia_transform__validateReport = __importStar(require("typia/lib/internal/_validateReport.js"));
const __typia_transform__createStandardSchema = __importStar(require("typia/lib/internal/_createStandardSchema.js"));
const __typia_transform__assertGuard = __importStar(require("typia/lib/internal/_assertGuard.js"));
const typia_1 = __importDefault(require("typia"));
const moose_lib_1 = require("@514labs/moose-lib");
const dictionaryBuilder_1 = require("./dictionaryBuilder");
const sinkTables_1 = require("./sinkTables");
exports.dictCustomers = (0, dictionaryBuilder_1.Dictionary)('dict_customers', {
    fields: {
        id: 'UInt64',
        country: 'String',
        city: 'String',
    },
    source: {
        table: 'dim_customer',
        where: 'is_deleted = 0',
    },
});
exports.dictProducts = (0, dictionaryBuilder_1.Dictionary)('dict_products', {
    fields: {
        id: 'UInt64',
        category: 'String',
        name: 'String',
    },
    source: {
        table: 'dim_product',
        where: 'is_deleted = 0',
    },
});
exports.dictOrders = (0, dictionaryBuilder_1.Dictionary)('dict_orders', {
    fields: {
        id: 'UInt64',
        customerId: 'UInt64',
        orderDate: 'DateTime',
        status: 'String',
    },
    source: {
        table: 'dim_order',
        where: 'is_deleted = 0',
    },
});
exports.JoinedOrders = new moose_lib_1.OlapTable('joined_orders', {
    engine: moose_lib_1.ClickHouseEngines.ReplacingMergeTree,
    orderByFields: ['id'],
    ver: 'lsn',
    isDeleted: 'is_deleted',
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
                },
                is_deleted: {
                    $ref: "#/components/schemas/UInt8"
                },
                lsn: {
                    $ref: "#/components/schemas/UInt64"
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
                "productName",
                "is_deleted",
                "lsn"
            ]
        }
    ]
}, JSON.parse("[{\"name\":\"id\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"customerId\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"productId\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"orderId\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"orderDate\",\"data_type\":\"DateTime\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"quantity\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"unitPrice\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"revenue\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"orderStatus\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"customerCountry\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"customerCity\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"productCategory\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"productName\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"is_deleted\",\"data_type\":\"UInt8\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"lsn\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]}]"), {
    validate: (data) => {
        const result = (() => { const _io0 = input => "number" === typeof input.id && __typia_transform__isTypeUint64._isTypeUint64(input.id) && ("number" === typeof input.customerId && __typia_transform__isTypeUint64._isTypeUint64(input.customerId)) && ("number" === typeof input.productId && __typia_transform__isTypeUint64._isTypeUint64(input.productId)) && ("number" === typeof input.orderId && __typia_transform__isTypeUint64._isTypeUint64(input.orderId)) && input.orderDate instanceof Date && "number" === typeof input.quantity && "number" === typeof input.unitPrice && "number" === typeof input.revenue && "string" === typeof input.orderStatus && "string" === typeof input.customerCountry && "string" === typeof input.customerCity && "string" === typeof input.productCategory && "string" === typeof input.productName && ("number" === typeof input.is_deleted && (0 <= input.is_deleted && input.is_deleted <= 255)) && ("number" === typeof input.lsn && __typia_transform__isTypeUint64._isTypeUint64(input.lsn)); const _vo0 = (input, _path, _exceptionable = true) => ["number" === typeof input.id && (__typia_transform__isTypeUint64._isTypeUint64(input.id) || _report(_exceptionable, {
                path: _path + ".id",
                expected: "number & Type<\"uint64\">",
                value: input.id
            })) || _report(_exceptionable, {
                path: _path + ".id",
                expected: "(number & Type<\"uint64\">)",
                value: input.id
            }), "number" === typeof input.customerId && (__typia_transform__isTypeUint64._isTypeUint64(input.customerId) || _report(_exceptionable, {
                path: _path + ".customerId",
                expected: "number & Type<\"uint64\">",
                value: input.customerId
            })) || _report(_exceptionable, {
                path: _path + ".customerId",
                expected: "(number & Type<\"uint64\">)",
                value: input.customerId
            }), "number" === typeof input.productId && (__typia_transform__isTypeUint64._isTypeUint64(input.productId) || _report(_exceptionable, {
                path: _path + ".productId",
                expected: "number & Type<\"uint64\">",
                value: input.productId
            })) || _report(_exceptionable, {
                path: _path + ".productId",
                expected: "(number & Type<\"uint64\">)",
                value: input.productId
            }), "number" === typeof input.orderId && (__typia_transform__isTypeUint64._isTypeUint64(input.orderId) || _report(_exceptionable, {
                path: _path + ".orderId",
                expected: "number & Type<\"uint64\">",
                value: input.orderId
            })) || _report(_exceptionable, {
                path: _path + ".orderId",
                expected: "(number & Type<\"uint64\">)",
                value: input.orderId
            }), input.orderDate instanceof Date || _report(_exceptionable, {
                path: _path + ".orderDate",
                expected: "Date",
                value: input.orderDate
            }), "number" === typeof input.quantity || _report(_exceptionable, {
                path: _path + ".quantity",
                expected: "number",
                value: input.quantity
            }), "number" === typeof input.unitPrice || _report(_exceptionable, {
                path: _path + ".unitPrice",
                expected: "number",
                value: input.unitPrice
            }), "number" === typeof input.revenue || _report(_exceptionable, {
                path: _path + ".revenue",
                expected: "number",
                value: input.revenue
            }), "string" === typeof input.orderStatus || _report(_exceptionable, {
                path: _path + ".orderStatus",
                expected: "string",
                value: input.orderStatus
            }), "string" === typeof input.customerCountry || _report(_exceptionable, {
                path: _path + ".customerCountry",
                expected: "string",
                value: input.customerCountry
            }), "string" === typeof input.customerCity || _report(_exceptionable, {
                path: _path + ".customerCity",
                expected: "string",
                value: input.customerCity
            }), "string" === typeof input.productCategory || _report(_exceptionable, {
                path: _path + ".productCategory",
                expected: "string",
                value: input.productCategory
            }), "string" === typeof input.productName || _report(_exceptionable, {
                path: _path + ".productName",
                expected: "string",
                value: input.productName
            }), "number" === typeof input.is_deleted && (0 <= input.is_deleted && input.is_deleted <= 255 || _report(_exceptionable, {
                path: _path + ".is_deleted",
                expected: "number & TagBase<__type>",
                value: input.is_deleted
            })) || _report(_exceptionable, {
                path: _path + ".is_deleted",
                expected: "(number & TagBase<__type>)",
                value: input.is_deleted
            }), "number" === typeof input.lsn && (__typia_transform__isTypeUint64._isTypeUint64(input.lsn) || _report(_exceptionable, {
                path: _path + ".lsn",
                expected: "number & Type<\"uint64\">",
                value: input.lsn
            })) || _report(_exceptionable, {
                path: _path + ".lsn",
                expected: "(number & Type<\"uint64\">)",
                value: input.lsn
            })].every(flag => flag); const __is = input => "object" === typeof input && null !== input && _io0(input); let errors; let _report; return __typia_transform__createStandardSchema._createStandardSchema(input => {
            if (false === __is(input)) {
                errors = [];
                _report = __typia_transform__validateReport._validateReport(errors);
                ((input, _path, _exceptionable = true) => ("object" === typeof input && null !== input || _report(true, {
                    path: _path + "",
                    expected: "__type",
                    value: input
                })) && _vo0(input, _path + "", true) || _report(true, {
                    path: _path + "",
                    expected: "__type",
                    value: input
                }))(input, "$input", true);
                const success = 0 === errors.length;
                return success ? {
                    success,
                    data: input
                } : {
                    success,
                    errors,
                    data: input
                };
            }
            return {
                success: true,
                data: input
            };
        }); })()(data);
        return {
            success: result.success,
            data: result.success ? result.data : undefined,
            errors: result.success ? undefined : result.errors
        };
    },
    assert: (() => { const _io0 = input => "number" === typeof input.id && __typia_transform__isTypeUint64._isTypeUint64(input.id) && ("number" === typeof input.customerId && __typia_transform__isTypeUint64._isTypeUint64(input.customerId)) && ("number" === typeof input.productId && __typia_transform__isTypeUint64._isTypeUint64(input.productId)) && ("number" === typeof input.orderId && __typia_transform__isTypeUint64._isTypeUint64(input.orderId)) && input.orderDate instanceof Date && "number" === typeof input.quantity && "number" === typeof input.unitPrice && "number" === typeof input.revenue && "string" === typeof input.orderStatus && "string" === typeof input.customerCountry && "string" === typeof input.customerCity && "string" === typeof input.productCategory && "string" === typeof input.productName && ("number" === typeof input.is_deleted && (0 <= input.is_deleted && input.is_deleted <= 255)) && ("number" === typeof input.lsn && __typia_transform__isTypeUint64._isTypeUint64(input.lsn)); const _ao0 = (input, _path, _exceptionable = true) => ("number" === typeof input.id && (__typia_transform__isTypeUint64._isTypeUint64(input.id) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".id",
        expected: "number & Type<\"uint64\">",
        value: input.id
    }, _errorFactory)) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".id",
        expected: "(number & Type<\"uint64\">)",
        value: input.id
    }, _errorFactory)) && ("number" === typeof input.customerId && (__typia_transform__isTypeUint64._isTypeUint64(input.customerId) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".customerId",
        expected: "number & Type<\"uint64\">",
        value: input.customerId
    }, _errorFactory)) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".customerId",
        expected: "(number & Type<\"uint64\">)",
        value: input.customerId
    }, _errorFactory)) && ("number" === typeof input.productId && (__typia_transform__isTypeUint64._isTypeUint64(input.productId) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".productId",
        expected: "number & Type<\"uint64\">",
        value: input.productId
    }, _errorFactory)) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".productId",
        expected: "(number & Type<\"uint64\">)",
        value: input.productId
    }, _errorFactory)) && ("number" === typeof input.orderId && (__typia_transform__isTypeUint64._isTypeUint64(input.orderId) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".orderId",
        expected: "number & Type<\"uint64\">",
        value: input.orderId
    }, _errorFactory)) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".orderId",
        expected: "(number & Type<\"uint64\">)",
        value: input.orderId
    }, _errorFactory)) && (input.orderDate instanceof Date || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".orderDate",
        expected: "Date",
        value: input.orderDate
    }, _errorFactory)) && ("number" === typeof input.quantity || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".quantity",
        expected: "number",
        value: input.quantity
    }, _errorFactory)) && ("number" === typeof input.unitPrice || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".unitPrice",
        expected: "number",
        value: input.unitPrice
    }, _errorFactory)) && ("number" === typeof input.revenue || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".revenue",
        expected: "number",
        value: input.revenue
    }, _errorFactory)) && ("string" === typeof input.orderStatus || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".orderStatus",
        expected: "string",
        value: input.orderStatus
    }, _errorFactory)) && ("string" === typeof input.customerCountry || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".customerCountry",
        expected: "string",
        value: input.customerCountry
    }, _errorFactory)) && ("string" === typeof input.customerCity || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".customerCity",
        expected: "string",
        value: input.customerCity
    }, _errorFactory)) && ("string" === typeof input.productCategory || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".productCategory",
        expected: "string",
        value: input.productCategory
    }, _errorFactory)) && ("string" === typeof input.productName || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".productName",
        expected: "string",
        value: input.productName
    }, _errorFactory)) && ("number" === typeof input.is_deleted && (0 <= input.is_deleted && input.is_deleted <= 255 || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".is_deleted",
        expected: "number & TagBase<__type>",
        value: input.is_deleted
    }, _errorFactory)) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".is_deleted",
        expected: "(number & TagBase<__type>)",
        value: input.is_deleted
    }, _errorFactory)) && ("number" === typeof input.lsn && (__typia_transform__isTypeUint64._isTypeUint64(input.lsn) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".lsn",
        expected: "number & Type<\"uint64\">",
        value: input.lsn
    }, _errorFactory)) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".lsn",
        expected: "(number & Type<\"uint64\">)",
        value: input.lsn
    }, _errorFactory)); const __is = input => "object" === typeof input && null !== input && _io0(input); let _errorFactory; return (input, errorFactory) => {
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
    }; })(),
    is: (() => { const _io0 = input => "number" === typeof input.id && __typia_transform__isTypeUint64._isTypeUint64(input.id) && ("number" === typeof input.customerId && __typia_transform__isTypeUint64._isTypeUint64(input.customerId)) && ("number" === typeof input.productId && __typia_transform__isTypeUint64._isTypeUint64(input.productId)) && ("number" === typeof input.orderId && __typia_transform__isTypeUint64._isTypeUint64(input.orderId)) && input.orderDate instanceof Date && "number" === typeof input.quantity && "number" === typeof input.unitPrice && "number" === typeof input.revenue && "string" === typeof input.orderStatus && "string" === typeof input.customerCountry && "string" === typeof input.customerCity && "string" === typeof input.productCategory && "string" === typeof input.productName && ("number" === typeof input.is_deleted && (0 <= input.is_deleted && input.is_deleted <= 255)) && ("number" === typeof input.lsn && __typia_transform__isTypeUint64._isTypeUint64(input.lsn)); return input => "object" === typeof input && null !== input && _io0(input); })()
});
exports.OrderFactEnrichedView = new moose_lib_1.MaterializedView({
    materializedViewName: 'join_orders_mv',
    selectStatement: (0, moose_lib_1.sql) `
    SELECT
    ${sinkTables_1.OrderItemTable.columns.id} as id,
    ${sinkTables_1.OrderItemTable.columns.orderId} as orderId,
    ${sinkTables_1.OrderItemTable.columns.productId} as productId,
    ${sinkTables_1.OrderItemTable.columns.quantity} as quantity,
    ${sinkTables_1.OrderItemTable.columns.price} as unitPrice,
    ${sinkTables_1.OrderItemTable.columns.quantity} * ${sinkTables_1.OrderItemTable.columns.price} as revenue,

    -- Lookup from dictionaries
    dictGet('dict_orders', 'customerId', oi.orderId) as customerId,
    dictGet('dict_orders', 'orderDate', oi.orderId) as orderDate,
    dictGet('dict_orders', 'status', oi.orderId) as orderStatus,

    dictGet('dict_customers', 'country',
        dictGet('dict_orders', 'customerId', oi.orderId)
    ) as customerCountry,

    dictGet('dict_customers', 'city',
        dictGet('dict_orders', 'customerId', oi.orderId)
    ) as customerCity,

    dictGet('dict_products', 'category', oi.productId) as productCategory,
    dictGet('dict_products', 'name', oi.productId) as productName,

    ${sinkTables_1.OrderItemTable.columns.is_deleted},
    ${sinkTables_1.OrderItemTable.columns.lsn}
    FROM ${sinkTables_1.OrderItemTable} oi
    `,
    selectTables: [sinkTables_1.OrderItemTable, exports.dictCustomers, exports.dictProducts, exports.dictOrders],
    targetTable: exports.JoinedOrders,
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
                },
                is_deleted: {
                    $ref: "#/components/schemas/UInt8"
                },
                lsn: {
                    $ref: "#/components/schemas/UInt64"
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
                "productName",
                "is_deleted",
                "lsn"
            ]
        }
    ]
}, JSON.parse("[{\"name\":\"id\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"customerId\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"productId\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"orderId\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"orderDate\",\"data_type\":\"DateTime\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"quantity\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"unitPrice\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"revenue\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"orderStatus\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"customerCountry\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"customerCity\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"productCategory\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"productName\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"is_deleted\",\"data_type\":\"UInt8\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"lsn\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]}]"));
//# sourceMappingURL=materializedViews.js.map