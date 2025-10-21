/**
 * Common types for OLTP to OLAP transformations
 */

export interface OLTPRecord {
  id: string | number;
  [key: string]: any;
}

export interface OLAPDimension {
  dimensionKey: string;
  attributes: Record<string, any>;
}

export interface OLAPFact {
  factKey: string;
  measures: Record<string, number>;
  dimensionKeys: Record<string, string | number>;
  timestamp: Date;
}

export interface TransformationConfig {
  dimensions: DimensionConfig[];
  facts: FactConfig[];
}

export interface DimensionConfig {
  name: string;
  sourceTable: string;
  keyField: string;
  attributes: string[];
}

export interface FactConfig {
  name: string;
  sourceTable: string;
  measures: MeasureConfig[];
  dimensionLinks: DimensionLink[];
  timestampField?: string;
}

export interface MeasureConfig {
  field: string;
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface DimensionLink {
  dimensionName: string;
  foreignKey: string;
}
