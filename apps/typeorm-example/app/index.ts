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
});

export const OlapOrder = new OlapTable<OlapOrder>('order', {
  orderByFields: ['id'],
});

export const OlapProduct = new OlapTable<OlapProduct>('product', {
  orderByFields: ['id'],
});

export const OlapOrderItem = new OlapTable<OlapOrderItem>('order_item', {
  orderByFields: ['id'],
});
