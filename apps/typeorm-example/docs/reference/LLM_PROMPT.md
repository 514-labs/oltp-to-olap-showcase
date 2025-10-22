# LLM Prompt: TypeORM → Moose OLAP Conversion

Convert TypeORM entities to Moose OlapTable definitions following these rules:

## Setup

```typescript
import { OlapTable, UInt64 } from '@514labs/moose-lib';
import { Entity1, Entity2, ... } from '../src/entities';

// Extract primitive fields (exclude methods)
type ExtractFields<T> = {
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
};

type Entity1Fields = ExtractFields<Entity1>;
type Entity2Fields = ExtractFields<Entity2>;
```

## Conversion Rules

### Rule 1: Dimensions (One per Main Entity)

```typescript
type EntityDimension = Omit<EntityFields, 'id' | 'relationField1' | 'relationField2'> & {
  id: UInt64;
};
```

### Rule 2: Facts (Business Processes)

```typescript
interface ProcessFact {
  // Primary key
  id: UInt64;

  // Foreign keys (always UInt64)
  entityId1: UInt64;
  entityId2: UInt64;

  // Time dimensions (for partitioning)
  timestamp: Entity1Fields['createdAt'];

  // Measures (borrowed types)
  quantity: Entity2Fields['quantity'];
  amount: Entity2Fields['amount'];
  calculatedMetric: number; // Pre-calculated

  // Denormalized attributes (borrowed types - avoid joins)
  entity1Status: Entity1Fields['status'];
  entity2Category: Entity2Fields['category'];
}
```

### Rule 3: OlapTable Definitions

```typescript
export const EntityDimension = new OlapTable<EntityDimension>('dim_entity', {
  orderByFields: ['id'],
});

export const ProcessFact = new OlapTable<ProcessFact>('fact_process', {
  orderByFields: ['timestamp', 'entityId1', 'entityId2'],
});
```

## Type Mappings

| TypeORM                                       | Moose OLAP                     |
| --------------------------------------------- | ------------------------------ |
| `@PrimaryGeneratedColumn() id: number`        | `id: UInt64`                   |
| `@ManyToOne(() => Entity) entity: Entity`     | `entityId: UInt64`             |
| `@OneToMany(() => Entity) entities: Entity[]` | _(omit, not in OLAP)_          |
| `@Column('varchar') field: string`            | `field: EntityFields['field']` |
| `@CreateDateColumn() date: Date`              | `date: EntityFields['date']`   |

## Key Principles

1. **Borrow types:** Use `EntityFields['fieldName']` to stay in sync
2. **No relations:** Convert object references to scalar foreign keys (`UInt64`)
3. **Denormalize:** Embed frequently-queried attributes in fact tables
4. **Pre-calculate:** Add computed measures (revenue, totals, etc.)
5. **Star schema:** Separate dimensions (descriptive) from facts (measurable events)

## Example

Input (TypeORM):

```typescript
@Entity()
class Customer {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;
  @Column() country: string;
  @OneToMany(() => Order, (order) => order.customer) orders: Order[];
}

@Entity()
class Order {
  @PrimaryGeneratedColumn() id: number;
  @Column() customerId: number;
  @ManyToOne(() => Customer) customer: Customer;
  @Column() total: number;
  @CreateDateColumn() orderDate: Date;
}
```

Output (Moose):

```typescript
type CustomerFields = ExtractFields<Customer>;
type OrderFields = ExtractFields<Order>;

type CustomerDimension = Omit<CustomerFields, 'id' | 'orders'> & { id: UInt64 };

interface OrderFact {
  id: UInt64;
  customerId: UInt64;
  orderDate: OrderFields['orderDate'];
  total: OrderFields['total'];
  customerCountry: CustomerFields['country']; // Denormalized
}

export const CustomerDimension = new OlapTable<CustomerDimension>('dim_customer', {
  orderByFields: ['id'],
});

export const OrderFact = new OlapTable<OrderFact>('fact_order', {
  orderByFields: ['orderDate', 'customerId'],
});
```

## Requirements

✅ All IDs must be `UInt64`
✅ No nested objects/relations
✅ Use borrowed types (`EntityFields['field']`)
✅ Denormalize frequently-queried attributes in facts
✅ Include time dimensions for partitioning
✅ Export all OlapTable instances
