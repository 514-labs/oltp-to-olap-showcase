import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * CustomerAddress Entity
 *
 * Represents customer address information including contact details.
 * Note: This entity has inconsistent naming (firstName vs last_name) from the original schema.
 */
@Entity('customer_addresses')
export class CustomerAddress {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ type: 'varchar', length: 100 })
  last_name!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'text', nullable: true })
  res_address!: string | null;

  @Column({ type: 'text', nullable: true })
  work_address!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone_1!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone_2!: string | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
