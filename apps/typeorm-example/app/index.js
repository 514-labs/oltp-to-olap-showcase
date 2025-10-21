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
exports.OlapOrderItem = exports.OlapProduct = exports.OlapOrder = exports.OlapCustomer = void 0;
const __typia_transform__isTypeUint64 = __importStar(require("typia/lib/internal/_isTypeUint64.js"));
const __typia_transform__validateReport = __importStar(require("typia/lib/internal/_validateReport.js"));
const __typia_transform__createStandardSchema = __importStar(require("typia/lib/internal/_createStandardSchema.js"));
const __typia_transform__assertGuard = __importStar(require("typia/lib/internal/_assertGuard.js"));
const typia_1 = __importDefault(require("typia"));
const moose_lib_1 = require("@514labs/moose-lib");
exports.OlapCustomer = new moose_lib_1.OlapTable('customer', {
    orderByFields: ['id'],
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
}, JSON.parse("[{\"name\":\"email\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"name\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"country\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"city\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"createdAt\",\"data_type\":\"DateTime\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"id\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]}]"), {
    validate: (data) => {
        const result = (() => { const _io0 = input => "string" === typeof input.email && "string" === typeof input.name && "string" === typeof input.country && "string" === typeof input.city && input.createdAt instanceof Date && ("number" === typeof input.id && __typia_transform__isTypeUint64._isTypeUint64(input.id)); const _vo0 = (input, _path, _exceptionable = true) => ["string" === typeof input.email || _report(_exceptionable, {
                path: _path + ".email",
                expected: "string",
                value: input.email
            }), "string" === typeof input.name || _report(_exceptionable, {
                path: _path + ".name",
                expected: "string",
                value: input.name
            }), "string" === typeof input.country || _report(_exceptionable, {
                path: _path + ".country",
                expected: "string",
                value: input.country
            }), "string" === typeof input.city || _report(_exceptionable, {
                path: _path + ".city",
                expected: "string",
                value: input.city
            }), input.createdAt instanceof Date || _report(_exceptionable, {
                path: _path + ".createdAt",
                expected: "Date",
                value: input.createdAt
            }), "number" === typeof input.id && (__typia_transform__isTypeUint64._isTypeUint64(input.id) || _report(_exceptionable, {
                path: _path + ".id",
                expected: "number & Type<\"uint64\">",
                value: input.id
            })) || _report(_exceptionable, {
                path: _path + ".id",
                expected: "(number & Type<\"uint64\">)",
                value: input.id
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
    assert: (() => { const _io0 = input => "string" === typeof input.email && "string" === typeof input.name && "string" === typeof input.country && "string" === typeof input.city && input.createdAt instanceof Date && ("number" === typeof input.id && __typia_transform__isTypeUint64._isTypeUint64(input.id)); const _ao0 = (input, _path, _exceptionable = true) => ("string" === typeof input.email || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".email",
        expected: "string",
        value: input.email
    }, _errorFactory)) && ("string" === typeof input.name || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".name",
        expected: "string",
        value: input.name
    }, _errorFactory)) && ("string" === typeof input.country || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".country",
        expected: "string",
        value: input.country
    }, _errorFactory)) && ("string" === typeof input.city || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".city",
        expected: "string",
        value: input.city
    }, _errorFactory)) && (input.createdAt instanceof Date || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".createdAt",
        expected: "Date",
        value: input.createdAt
    }, _errorFactory)) && ("number" === typeof input.id && (__typia_transform__isTypeUint64._isTypeUint64(input.id) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".id",
        expected: "number & Type<\"uint64\">",
        value: input.id
    }, _errorFactory)) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".id",
        expected: "(number & Type<\"uint64\">)",
        value: input.id
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
    is: (() => { const _io0 = input => "string" === typeof input.email && "string" === typeof input.name && "string" === typeof input.country && "string" === typeof input.city && input.createdAt instanceof Date && ("number" === typeof input.id && __typia_transform__isTypeUint64._isTypeUint64(input.id)); return input => "object" === typeof input && null !== input && _io0(input); })()
});
exports.OlapOrder = new moose_lib_1.OlapTable('order', {
    orderByFields: ['id'],
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
}, JSON.parse("[{\"name\":\"customerId\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"orderDate\",\"data_type\":\"DateTime\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"status\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"total\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"id\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]}]"), {
    validate: (data) => {
        const result = (() => { const _io0 = input => "number" === typeof input.customerId && input.orderDate instanceof Date && "string" === typeof input.status && "number" === typeof input.total && ("number" === typeof input.id && __typia_transform__isTypeUint64._isTypeUint64(input.id)); const _vo0 = (input, _path, _exceptionable = true) => ["number" === typeof input.customerId || _report(_exceptionable, {
                path: _path + ".customerId",
                expected: "number",
                value: input.customerId
            }), input.orderDate instanceof Date || _report(_exceptionable, {
                path: _path + ".orderDate",
                expected: "Date",
                value: input.orderDate
            }), "string" === typeof input.status || _report(_exceptionable, {
                path: _path + ".status",
                expected: "string",
                value: input.status
            }), "number" === typeof input.total || _report(_exceptionable, {
                path: _path + ".total",
                expected: "number",
                value: input.total
            }), "number" === typeof input.id && (__typia_transform__isTypeUint64._isTypeUint64(input.id) || _report(_exceptionable, {
                path: _path + ".id",
                expected: "number & Type<\"uint64\">",
                value: input.id
            })) || _report(_exceptionable, {
                path: _path + ".id",
                expected: "(number & Type<\"uint64\">)",
                value: input.id
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
    assert: (() => { const _io0 = input => "number" === typeof input.customerId && input.orderDate instanceof Date && "string" === typeof input.status && "number" === typeof input.total && ("number" === typeof input.id && __typia_transform__isTypeUint64._isTypeUint64(input.id)); const _ao0 = (input, _path, _exceptionable = true) => ("number" === typeof input.customerId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".customerId",
        expected: "number",
        value: input.customerId
    }, _errorFactory)) && (input.orderDate instanceof Date || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".orderDate",
        expected: "Date",
        value: input.orderDate
    }, _errorFactory)) && ("string" === typeof input.status || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".status",
        expected: "string",
        value: input.status
    }, _errorFactory)) && ("number" === typeof input.total || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".total",
        expected: "number",
        value: input.total
    }, _errorFactory)) && ("number" === typeof input.id && (__typia_transform__isTypeUint64._isTypeUint64(input.id) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".id",
        expected: "number & Type<\"uint64\">",
        value: input.id
    }, _errorFactory)) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".id",
        expected: "(number & Type<\"uint64\">)",
        value: input.id
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
    is: (() => { const _io0 = input => "number" === typeof input.customerId && input.orderDate instanceof Date && "string" === typeof input.status && "number" === typeof input.total && ("number" === typeof input.id && __typia_transform__isTypeUint64._isTypeUint64(input.id)); return input => "object" === typeof input && null !== input && _io0(input); })()
});
exports.OlapProduct = new moose_lib_1.OlapTable('product', {
    orderByFields: ['id'],
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
}, JSON.parse("[{\"name\":\"name\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"createdAt\",\"data_type\":\"DateTime\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"category\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"price\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"id\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]}]"), {
    validate: (data) => {
        const result = (() => { const _io0 = input => "string" === typeof input.name && input.createdAt instanceof Date && "string" === typeof input.category && "number" === typeof input.price && ("number" === typeof input.id && __typia_transform__isTypeUint64._isTypeUint64(input.id)); const _vo0 = (input, _path, _exceptionable = true) => ["string" === typeof input.name || _report(_exceptionable, {
                path: _path + ".name",
                expected: "string",
                value: input.name
            }), input.createdAt instanceof Date || _report(_exceptionable, {
                path: _path + ".createdAt",
                expected: "Date",
                value: input.createdAt
            }), "string" === typeof input.category || _report(_exceptionable, {
                path: _path + ".category",
                expected: "string",
                value: input.category
            }), "number" === typeof input.price || _report(_exceptionable, {
                path: _path + ".price",
                expected: "number",
                value: input.price
            }), "number" === typeof input.id && (__typia_transform__isTypeUint64._isTypeUint64(input.id) || _report(_exceptionable, {
                path: _path + ".id",
                expected: "number & Type<\"uint64\">",
                value: input.id
            })) || _report(_exceptionable, {
                path: _path + ".id",
                expected: "(number & Type<\"uint64\">)",
                value: input.id
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
    assert: (() => { const _io0 = input => "string" === typeof input.name && input.createdAt instanceof Date && "string" === typeof input.category && "number" === typeof input.price && ("number" === typeof input.id && __typia_transform__isTypeUint64._isTypeUint64(input.id)); const _ao0 = (input, _path, _exceptionable = true) => ("string" === typeof input.name || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".name",
        expected: "string",
        value: input.name
    }, _errorFactory)) && (input.createdAt instanceof Date || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".createdAt",
        expected: "Date",
        value: input.createdAt
    }, _errorFactory)) && ("string" === typeof input.category || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".category",
        expected: "string",
        value: input.category
    }, _errorFactory)) && ("number" === typeof input.price || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".price",
        expected: "number",
        value: input.price
    }, _errorFactory)) && ("number" === typeof input.id && (__typia_transform__isTypeUint64._isTypeUint64(input.id) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".id",
        expected: "number & Type<\"uint64\">",
        value: input.id
    }, _errorFactory)) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".id",
        expected: "(number & Type<\"uint64\">)",
        value: input.id
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
    is: (() => { const _io0 = input => "string" === typeof input.name && input.createdAt instanceof Date && "string" === typeof input.category && "number" === typeof input.price && ("number" === typeof input.id && __typia_transform__isTypeUint64._isTypeUint64(input.id)); return input => "object" === typeof input && null !== input && _io0(input); })()
});
exports.OlapOrderItem = new moose_lib_1.OlapTable('order_item', {
    orderByFields: ['id'],
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
                }
            },
            required: [
                "price",
                "orderId",
                "productId",
                "quantity",
                "id"
            ]
        }
    ]
}, JSON.parse("[{\"name\":\"price\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"orderId\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"productId\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"quantity\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"id\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]}]"), {
    validate: (data) => {
        const result = (() => { const _io0 = input => "number" === typeof input.price && "number" === typeof input.orderId && "number" === typeof input.productId && "number" === typeof input.quantity && ("number" === typeof input.id && __typia_transform__isTypeUint64._isTypeUint64(input.id)); const _vo0 = (input, _path, _exceptionable = true) => ["number" === typeof input.price || _report(_exceptionable, {
                path: _path + ".price",
                expected: "number",
                value: input.price
            }), "number" === typeof input.orderId || _report(_exceptionable, {
                path: _path + ".orderId",
                expected: "number",
                value: input.orderId
            }), "number" === typeof input.productId || _report(_exceptionable, {
                path: _path + ".productId",
                expected: "number",
                value: input.productId
            }), "number" === typeof input.quantity || _report(_exceptionable, {
                path: _path + ".quantity",
                expected: "number",
                value: input.quantity
            }), "number" === typeof input.id && (__typia_transform__isTypeUint64._isTypeUint64(input.id) || _report(_exceptionable, {
                path: _path + ".id",
                expected: "number & Type<\"uint64\">",
                value: input.id
            })) || _report(_exceptionable, {
                path: _path + ".id",
                expected: "(number & Type<\"uint64\">)",
                value: input.id
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
    assert: (() => { const _io0 = input => "number" === typeof input.price && "number" === typeof input.orderId && "number" === typeof input.productId && "number" === typeof input.quantity && ("number" === typeof input.id && __typia_transform__isTypeUint64._isTypeUint64(input.id)); const _ao0 = (input, _path, _exceptionable = true) => ("number" === typeof input.price || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".price",
        expected: "number",
        value: input.price
    }, _errorFactory)) && ("number" === typeof input.orderId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".orderId",
        expected: "number",
        value: input.orderId
    }, _errorFactory)) && ("number" === typeof input.productId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".productId",
        expected: "number",
        value: input.productId
    }, _errorFactory)) && ("number" === typeof input.quantity || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".quantity",
        expected: "number",
        value: input.quantity
    }, _errorFactory)) && ("number" === typeof input.id && (__typia_transform__isTypeUint64._isTypeUint64(input.id) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".id",
        expected: "number & Type<\"uint64\">",
        value: input.id
    }, _errorFactory)) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "____moose____typia.createAssert",
        path: _path + ".id",
        expected: "(number & Type<\"uint64\">)",
        value: input.id
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
    is: (() => { const _io0 = input => "number" === typeof input.price && "number" === typeof input.orderId && "number" === typeof input.productId && "number" === typeof input.quantity && ("number" === typeof input.id && __typia_transform__isTypeUint64._isTypeUint64(input.id)); return input => "object" === typeof input && null !== input && _io0(input); })()
});
//# sourceMappingURL=index.js.map