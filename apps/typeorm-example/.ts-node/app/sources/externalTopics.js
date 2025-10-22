"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeormCdcEventsStream = exports.TypeormPublicNullStream = void 0;
const typia_1 = __importDefault(require("typia"));
const moose_lib_1 = require("@514labs/moose-lib");
exports.TypeormPublicNullStream = new moose_lib_1.Stream('typeorm.public.null', {
    lifeCycle: moose_lib_1.LifeCycle.EXTERNALLY_MANAGED,
}, {
    version: "3.1",
    components: {
        schemas: {}
    },
    schemas: [
        {
            type: "object",
            properties: {},
            required: []
        }
    ]
}, JSON.parse("[]"));
exports.TypeormCdcEventsStream = new moose_lib_1.Stream('typeorm_cdc_events', {
    lifeCycle: moose_lib_1.LifeCycle.EXTERNALLY_MANAGED,
}, {
    version: "3.1",
    components: {
        schemas: {}
    },
    schemas: [
        {
            type: "object",
            properties: {},
            required: []
        }
    ]
}, JSON.parse("[]"));
//# sourceMappingURL=externalTopics.js.map