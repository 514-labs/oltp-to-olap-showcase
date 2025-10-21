import ____moose____typia from "typia";
import { OlapTable, UInt64 } from '@514labs/moose-lib';
import { Customer, Order, Product, OrderItem } from '../src/entities';
type OlapCustomer = Omit<InstanceType<typeof Customer>, 'id' | 'orders'> & {
    id: UInt64;
};
type OlapOrder = Omit<InstanceType<typeof Order>, 'id' | 'items' | 'customer'> & {
    id: UInt64;
};
type OlapProduct = Omit<InstanceType<typeof Product>, 'id' | 'orderItems'> & {
    id: UInt64;
};
type OlapOrderItem = Omit<InstanceType<typeof OrderItem>, 'id' | 'order' | 'product'> & {
    id: UInt64;
};
export const OlapCustomer = new OlapTable<OlapCustomer>('customer', {
    orderByFields: ['id'],
}, ____moose____typia.json.schemas<[
    import("@514labs/moose-lib").StripDateIntersection<OlapCustomer>
]>(), JSON.parse("[{\"name\":\"email\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"name\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"country\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"city\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"createdAt\",\"data_type\":\"DateTime\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"id\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]}]") as any, {
    validate: (data: unknown) => {
        const result = ____moose____typia.createValidate<import("@514labs/moose-lib").StripDateIntersection<OlapCustomer>>()(data);
        return {
            success: result.success,
            data: result.success ? result.data : undefined,
            errors: result.success ? undefined : result.errors
        };
    },
    assert: ____moose____typia.createAssert<import("@514labs/moose-lib").StripDateIntersection<OlapCustomer>>(),
    is: ____moose____typia.createIs<import("@514labs/moose-lib").StripDateIntersection<OlapCustomer>>()
});
export const OlapOrder = new OlapTable<OlapOrder>('order', {
    orderByFields: ['id'],
}, ____moose____typia.json.schemas<[
    import("@514labs/moose-lib").StripDateIntersection<OlapOrder>
]>(), JSON.parse("[{\"name\":\"customerId\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"orderDate\",\"data_type\":\"DateTime\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"status\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"total\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"id\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]}]") as any, {
    validate: (data: unknown) => {
        const result = ____moose____typia.createValidate<import("@514labs/moose-lib").StripDateIntersection<OlapOrder>>()(data);
        return {
            success: result.success,
            data: result.success ? result.data : undefined,
            errors: result.success ? undefined : result.errors
        };
    },
    assert: ____moose____typia.createAssert<import("@514labs/moose-lib").StripDateIntersection<OlapOrder>>(),
    is: ____moose____typia.createIs<import("@514labs/moose-lib").StripDateIntersection<OlapOrder>>()
});
export const OlapProduct = new OlapTable<OlapProduct>('product', {
    orderByFields: ['id'],
}, ____moose____typia.json.schemas<[
    import("@514labs/moose-lib").StripDateIntersection<OlapProduct>
]>(), JSON.parse("[{\"name\":\"name\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"createdAt\",\"data_type\":\"DateTime\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"category\",\"data_type\":\"String\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"price\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"id\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]}]") as any, {
    validate: (data: unknown) => {
        const result = ____moose____typia.createValidate<import("@514labs/moose-lib").StripDateIntersection<OlapProduct>>()(data);
        return {
            success: result.success,
            data: result.success ? result.data : undefined,
            errors: result.success ? undefined : result.errors
        };
    },
    assert: ____moose____typia.createAssert<import("@514labs/moose-lib").StripDateIntersection<OlapProduct>>(),
    is: ____moose____typia.createIs<import("@514labs/moose-lib").StripDateIntersection<OlapProduct>>()
});
export const OlapOrderItem = new OlapTable<OlapOrderItem>('order_item', {
    orderByFields: ['id'],
}, ____moose____typia.json.schemas<[
    import("@514labs/moose-lib").StripDateIntersection<OlapOrderItem>
]>(), JSON.parse("[{\"name\":\"price\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"orderId\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"productId\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"quantity\",\"data_type\":\"Float\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]},{\"name\":\"id\",\"data_type\":\"UInt64\",\"primary_key\":false,\"required\":true,\"unique\":false,\"default\":null,\"ttl\":null,\"annotations\":[]}]") as any, {
    validate: (data: unknown) => {
        const result = ____moose____typia.createValidate<import("@514labs/moose-lib").StripDateIntersection<OlapOrderItem>>()(data);
        return {
            success: result.success,
            data: result.success ? result.data : undefined,
            errors: result.success ? undefined : result.errors
        };
    },
    assert: ____moose____typia.createAssert<import("@514labs/moose-lib").StripDateIntersection<OlapOrderItem>>(),
    is: ____moose____typia.createIs<import("@514labs/moose-lib").StripDateIntersection<OlapOrderItem>>()
});
