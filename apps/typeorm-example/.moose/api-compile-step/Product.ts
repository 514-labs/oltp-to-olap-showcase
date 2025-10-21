import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { OrderItem } from './OrderItem';
/**
 * Product Entity - OLTP Model
 */
@Entity('products')
export class Product {
    @PrimaryGeneratedColumn()
    id!: number;
    @Column('varchar')
    name!: string;
    @Column('varchar')
    category!: string;
    @Column('float')
    price!: number;
    @CreateDateColumn()
    createdAt!: Date;
    @OneToMany(() => OrderItem, (orderItem) => orderItem.product)
    orderItems!: OrderItem[];
}
