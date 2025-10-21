import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Customer } from './Customer';
import { OrderItem } from './OrderItem';

/**
 * Order Entity - OLTP Model
 */
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('int')
  customerId!: number;

  @ManyToOne(() => Customer, (customer) => customer.orders)
  customer!: Customer;

  @CreateDateColumn()
  orderDate!: Date;

  @Column('varchar')
  status!: string;

  @Column('float')
  total!: number;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  items!: OrderItem[];
}
