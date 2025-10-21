/**
 * Individual Table Generators
 *
 * Utilities for generating individual dimension and fact tables
 */

import { StarSchemaGenerator, DimensionConfig, FactConfig, TableDefinition } from './star-schema-generator';

export interface GeneratedTable {
  table: TableDefinition;
  ddl: string;
}

/**
 * Generate a dimension table from a model
 */
export function generateDimensionFromModel<T extends Record<string, any>>(
  tableName: string,
  sampleRecord: T,
  config: DimensionConfig
): GeneratedTable {
  const generator = new StarSchemaGenerator();
  generator.addDimension(tableName, sampleRecord, config);

  const tableDef = generator.getDimensions().get(tableName)!;
  const ddl = generator.generateDDL();

  return {
    table: tableDef,
    ddl,
  };
}

/**
 * Generate a fact table from a model
 */
export function generateFactFromModel<T extends Record<string, any>>(
  tableName: string,
  sampleRecord: T,
  config: FactConfig
): GeneratedTable {
  const generator = new StarSchemaGenerator();
  generator.addFact(tableName, sampleRecord, config);

  const tableDef = generator.getFacts().get(tableName)!;
  const ddl = generator.generateDDL();

  return {
    table: tableDef,
    ddl,
  };
}

/**
 * Type-safe dimension configuration
 */
export interface DimensionDefinition<T, K extends keyof T> {
  name: string;
  sourceTable: string;
  keyField: keyof T;
  attributes: readonly K[];
}

/**
 * Define a type-safe dimension configuration
 */
export function defineDimension<T, K extends keyof T>(
  config: DimensionDefinition<T, K>
): DimensionDefinition<T, K> {
  return config;
}

/**
 * Type-safe fact configuration
 */
export interface MeasureDefinition<K extends string> {
  field: K;
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface DimensionLinkDefinition {
  dimensionName: string;
  foreignKey: string;
}

export interface FactDefinition<T, M extends keyof T, D extends Record<string, any>> {
  name: string;
  sourceTable: string;
  measures: readonly MeasureDefinition<M & string>[];
  dimensionLinks: readonly DimensionLinkDefinition[];
  timestampField: keyof T;
}

/**
 * Define a type-safe fact configuration
 */
export function defineFact<T, M extends keyof T, D extends Record<string, any>>(
  config: FactDefinition<T, M, D>
): FactDefinition<T, M, D> {
  return config;
}
