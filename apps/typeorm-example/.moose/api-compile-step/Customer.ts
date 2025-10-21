import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { Order } from './Order';
/**
 * Customer Entity - OLTP Model
 */
@Entity('customers')
export class Customer {
    @PrimaryGeneratedColumn()
    id!: number;
    @Column({ type: 'varchar', unique: true })
    email!: string;
    @Column('varchar')
    name!: string;
    @Column('varchar')
    country!: string;
    @Column('varchar')
    city!: string;
    @CreateDateColumn()
    createdAt!: Date;
    @OneToMany(() => Order, (order) => order.customer)
    orders!: Order[];
}
