/**
 * Star Schema Generator for ClickHouse
 *
 * Generates ClickHouse DDL for star schema (dimensions + facts)
 * following MooseStack OLAP patterns
 */

import { inferColumnDefinitions, TypeInferenceOptions } from './clickhouse-types';

export interface DimensionConfig extends TypeInferenceOptions {
  /**
   * Primary key field
   */
  keyField: string;

  /**
   * Attribute fields to include in the dimension
   */
  attributes: string[];

  /**
   * Optional: Engine type (default: ReplacingMergeTree)
   */
  engine?: 'ReplacingMergeTree' | 'MergeTree';

  /**
   * Optional: Additional ORDER BY fields
   */
  orderByFields?: string[];
}

export interface FactConfig extends TypeInferenceOptions {
  /**
   * Measure fields (numeric values to aggregate)
   */
  measures: string[];

  /**
   * Dimension foreign key fields
   */
  dimensionKeys: string[];

  /**
   * Timestamp field for partitioning
   */
  timestampField: string;

  /**
   * Optional: Partition granularity (default: monthly)
   */
  partitionBy?: 'daily' | 'weekly' | 'monthly' | 'yearly';

  /**
   * Optional: Engine type (default: MergeTree)
   */
  engine?: 'MergeTree' | 'SummingMergeTree' | 'AggregatingMergeTree';
}

export interface TableDefinition {
  name: string;
  columns: Record<string, string>;
  engine: string;
  orderBy: string[];
  partitionBy?: string;
  primaryKey?: string[];
}

/**
 * StarSchemaGenerator
 *
 * Main class for generating ClickHouse star schema DDL
 */
export class StarSchemaGenerator {
  private dimensions: Map<string, TableDefinition> = new Map();
  private facts: Map<string, TableDefinition> = new Map();

  /**
   * Add a dimension table to the schema
   */
  addDimension<T extends Record<string, any>>(
    tableName: string,
    sampleRecord: T,
    config: DimensionConfig
  ): this {
    const { keyField, attributes, engine = 'ReplacingMergeTree', orderByFields = [] } = config;

    // Build column definitions
    const allFields = [keyField, ...attributes];
    const relevantRecord: Record<string, any> = {};
    for (const field of allFields) {
      if (field in sampleRecord) {
        relevantRecord[field] = sampleRecord[field];
      }
    }

    const columns = inferColumnDefinitions(relevantRecord, config);

    // Build table definition
    const tableDef: TableDefinition = {
      name: tableName,
      columns,
      engine,
      orderBy: [keyField, ...orderByFields],
      primaryKey: [keyField],
    };

    this.dimensions.set(tableName, tableDef);
    return this;
  }

  /**
   * Add a fact table to the schema
   */
  addFact<T extends Record<string, any>>(
    tableName: string,
    sampleRecord: T,
    config: FactConfig
  ): this {
    const {
      measures,
      dimensionKeys,
      timestampField,
      partitionBy = 'monthly',
      engine = 'MergeTree',
    } = config;

    // Build column definitions
    const allFields = [...measures, ...dimensionKeys, timestampField];
    const relevantRecord: Record<string, any> = {};
    for (const field of allFields) {
      if (field in sampleRecord) {
        relevantRecord[field] = sampleRecord[field];
      }
    }

    const columns = inferColumnDefinitions(relevantRecord, config);

    // Build partition expression
    let partitionExpr: string;
    switch (partitionBy) {
      case 'daily':
        partitionExpr = `toYYYYMMDD(${timestampField})`;
        break;
      case 'weekly':
        partitionExpr = `toYearWeek(${timestampField})`;
        break;
      case 'monthly':
        partitionExpr = `toYYYYMM(${timestampField})`;
        break;
      case 'yearly':
        partitionExpr = `toYear(${timestampField})`;
        break;
    }

    // Build table definition
    const tableDef: TableDefinition = {
      name: tableName,
      columns,
      engine,
      orderBy: [timestampField, ...dimensionKeys],
      partitionBy: partitionExpr,
    };

    this.facts.set(tableName, tableDef);
    return this;
  }

  /**
   * Generate DDL for all tables in the schema
   */
  generateDDL(): string {
    const ddlStatements: string[] = [];

    // Generate dimension DDL
    for (const [name, def] of this.dimensions) {
      ddlStatements.push(this.generateTableDDL(def));
    }

    // Generate fact DDL
    for (const [name, def] of this.facts) {
      ddlStatements.push(this.generateTableDDL(def));
    }

    return ddlStatements.join('\n\n');
  }

  /**
   * Generate DDL for a single table
   */
  private generateTableDDL(def: TableDefinition): string {
    const lines: string[] = [];

    // Table header
    lines.push(`CREATE TABLE IF NOT EXISTS ${def.name} (`);

    // Columns
    const columnDefs = Object.entries(def.columns).map(([name, type]) => `  ${name} ${type}`);
    lines.push(columnDefs.join(',\n'));

    lines.push(')');

    // Engine
    lines.push(`ENGINE = ${def.engine}()`);

    // Order by
    lines.push(`ORDER BY (${def.orderBy.join(', ')})`);

    // Primary key (if defined)
    if (def.primaryKey && def.primaryKey.length > 0) {
      lines.push(`PRIMARY KEY (${def.primaryKey.join(', ')})`);
    }

    // Partition by (if defined)
    if (def.partitionBy) {
      lines.push(`PARTITION BY ${def.partitionBy}`);
    }

    lines.push(';');

    return lines.join('\n');
  }

  /**
   * Get all dimension tables
   */
  getDimensions(): Map<string, TableDefinition> {
    return this.dimensions;
  }

  /**
   * Get all fact tables
   */
  getFacts(): Map<string, TableDefinition> {
    return this.facts;
  }
}
