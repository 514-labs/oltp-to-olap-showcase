import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Order } from './Order';
import { Product } from './Product';
/**
 * OrderItem Entity - OLTP Model
 */
@Entity('order_items')
export class OrderItem {
    @PrimaryGeneratedColumn()
    id!: number;
    @Column('int')
    orderId!: number;
    @ManyToOne(() => Order, (order) => order.items)
    order!: Order;
    @Column('int')
    productId!: number;
    @ManyToOne(() => Product, (product) => product.orderItems)
    product!: Product;
    @Column('int')
    quantity!: number;
    @Column('float')
    price!: number;
}
