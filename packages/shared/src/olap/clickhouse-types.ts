/**
 * ClickHouse Type Mapping Utilities
 *
 * Maps TypeScript/JavaScript types to ClickHouse column types
 */

export function inferClickHouseType(value: any): string {
  if (value === null || value === undefined) {
    return 'Nullable(String)';
  }

  const type = typeof value;

  switch (type) {
    case 'string':
      // Use LowCardinality for strings that likely have low cardinality
      // (good for dimensions like country, category, status)
      if (value.length < 100) {
        return 'LowCardinality(String)';
      }
      return 'String';

    case 'number':
      // Check if integer or float
      if (Number.isInteger(value)) {
        // Use appropriate integer type based on value range
        if (value >= 0) {
          if (value <= 255) return 'UInt8';
          if (value <= 65535) return 'UInt16';
          if (value <= 4294967295) return 'UInt32';
          return 'UInt64';
        } else {
          if (value >= -128 && value <= 127) return 'Int8';
          if (value >= -32768 && value <= 32767) return 'Int16';
          if (value >= -2147483648 && value <= 2147483647) return 'Int32';
          return 'Int64';
        }
      }
      return 'Float64';

    case 'boolean':
      return 'Bool';

    case 'object':
      if (value instanceof Date) {
        return 'DateTime';
      }
      if (Array.isArray(value)) {
        // Infer array element type from first element
        if (value.length > 0) {
          const elementType = inferClickHouseType(value[0]);
          return `Array(${elementType})`;
        }
        return 'Array(String)';
      }
      // For complex objects, serialize as JSON string
      return 'String';

    default:
      return 'String';
  }
}

/**
 * Configuration options for type inference
 */
export interface TypeInferenceOptions {
  /**
   * Force specific types for certain fields
   */
  typeOverrides?: Record<string, string>;

  /**
   * Fields to treat as low cardinality strings
   */
  lowCardinalityFields?: string[];

  /**
   * Fields to exclude from type inference
   */
  excludeFields?: string[];
}

/**
 * Infer ClickHouse column definitions from a sample record
 */
export function inferColumnDefinitions(
  sampleRecord: Record<string, any>,
  options: TypeInferenceOptions = {}
): Record<string, string> {
  const { typeOverrides = {}, lowCardinalityFields = [], excludeFields = [] } = options;
  const columns: Record<string, string> = {};

  for (const [key, value] of Object.entries(sampleRecord)) {
    // Skip excluded fields
    if (excludeFields.includes(key)) {
      continue;
    }

    // Use override type if provided
    if (typeOverrides[key]) {
      columns[key] = typeOverrides[key];
      continue;
    }

    // Force low cardinality for specified fields
    if (lowCardinalityFields.includes(key) && typeof value === 'string') {
      columns[key] = 'LowCardinality(String)';
      continue;
    }

    // Infer type from value
    columns[key] = inferClickHouseType(value);
  }

  return columns;
}

/**
 * Format ClickHouse type with nullability
 */
export function makeNullable(type: string): string {
  if (type.startsWith('Nullable(')) {
    return type;
  }
  return `Nullable(${type})`;
}

/**
 * Get optimal integer type for dimension keys
 */
export function getDimensionKeyType(maxValue?: number): string {
  if (!maxValue) return 'UInt64'; // Default to UInt64 for safety

  if (maxValue <= 255) return 'UInt8';
  if (maxValue <= 65535) return 'UInt16';
  if (maxValue <= 4294967295) return 'UInt32';
  return 'UInt64';
}
