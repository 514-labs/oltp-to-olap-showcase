/**
 * Dictionary SDK
 *
 * ClickHouse dictionary factory function that creates SqlResource objects.
 * Handles connection configuration, SQL generation, and teardown automatically.
 *
 * Example:
 * ```ts
 * export const dictCustomers = Dictionary('dict_customers', {
 *   fields: {
 *     id: 'UInt64',
 *     country: 'String',
 *     city: 'String',
 *   },
 *   source: {
 *     table: 'dim_customer',
 *     where: 'is_deleted = 0',
 *   },
 * });
 * ```
 */

import { SqlResource } from '@514labs/moose-lib';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ClickHouseType =
  | 'UInt8'
  | 'UInt16'
  | 'UInt32'
  | 'UInt64'
  | 'Int8'
  | 'Int16'
  | 'Int32'
  | 'Int64'
  | 'Float32'
  | 'Float64'
  | 'String'
  | 'DateTime'
  | 'Date'
  | 'Bool'
  | string; // Allow custom types

export type DictionaryLayout =
  | 'FLAT'
  | 'HASHED'
  | 'CACHE'
  | 'COMPLEX_KEY_HASHED'
  | 'COMPLEX_KEY_CACHE';

export interface DictionaryFields {
  [fieldName: string]: ClickHouseType;
}

export interface ClickHouseConnection {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

export interface DictionaryLifetime {
  min: number;
  max: number;
}

/**
 * Source configuration for dictionary data
 */
export interface DictionarySource {
  /** Table name to source from */
  table: string;
  /** Database name (defaults to 'local') */
  database?: string;
  /** Specific columns to select (defaults to all fields) */
  columns?: string[];
  /** WHERE clause filter */
  where?: string;
}

/**
 * Configuration for Dictionary
 */
export interface DictionaryConfig<T extends DictionaryFields = DictionaryFields> {
  /** Field definitions with ClickHouse types */
  fields: T;
  /** Source configuration (table-based) */
  source?: DictionarySource;
  /** Custom SQL query (alternative to source) */
  query?: string;
  /** Primary key field(s) - defaults to 'id' or first field */
  primaryKey?: keyof T | (keyof T)[];
  /** Dictionary layout - defaults to 'FLAT' */
  layout?: DictionaryLayout;
  /** Cache lifetime in seconds - defaults to {min: 300, max: 600} */
  lifetime?: Partial<DictionaryLifetime>;
  /** Connection settings - uses defaults if not specified */
  connection?: Partial<ClickHouseConnection>;
  /** Database for dictionary creation */
  database?: string;
}

// ============================================================================
// DICTIONARY FACTORY FUNCTION
// ============================================================================

/**
 * Create a ClickHouse Dictionary as a SqlResource
 * Follows Moose SDK pattern with a factory function
 *
 * @example
 * export const dictCustomers = Dictionary('dict_customers', {
 *   fields: { id: 'UInt64', country: 'String', city: 'String' },
 *   source: { table: 'dim_customer', where: 'is_deleted = 0' },
 * });
 */
export function Dictionary<T extends DictionaryFields = DictionaryFields>(
  name: string,
  config: DictionaryConfig<T>
): SqlResource {
  const { createSql, teardownSql } = generateDictionarySql(name, config);
  return new SqlResource(name, [createSql], [teardownSql]);
}

/**
 * Generate CREATE and DROP SQL statements for a dictionary
 */
function generateDictionarySql<T extends DictionaryFields>(
  name: string,
  config: DictionaryConfig<T>
): { createSql: string; teardownSql: string } {
  // Validate configuration
  if (!config.source && !config.query) {
    throw new Error(
      `Dictionary ${name}: Must specify either 'source' (table-based) or 'query' (custom SQL).`
    );
  }

  // Set defaults
  const defaultConnection: ClickHouseConnection = {
    host: 'localhost',
    port: 9000,
    user: 'panda',
    password: 'pandapass',
    database: 'local',
  };

  const connection = { ...defaultConnection, ...config.connection };
  const layout = config.layout || 'FLAT';
  const lifetime = { min: 300, max: 600, ...config.lifetime };

  // Determine primary key(s)
  let primaryKeys: (keyof T)[];
  if (config.primaryKey) {
    primaryKeys = Array.isArray(config.primaryKey) ? config.primaryKey : [config.primaryKey];
  } else if ('id' in config.fields) {
    primaryKeys = ['id' as keyof T];
  } else {
    primaryKeys = [Object.keys(config.fields)[0] as keyof T];
  }

  // Build source query
  let sourceQuery: string;
  if (config.query) {
    sourceQuery = config.query;
  } else if (config.source) {
    const sourceDb = config.source.database || connection.database || 'local';
    const columns = config.source.columns || Object.keys(config.fields);
    const columnList = columns.join(', ');
    const whereClause = config.source.where ? ` WHERE ${config.source.where}` : '';
    sourceQuery = `SELECT ${columnList} FROM ${sourceDb}.${config.source.table}${whereClause}`;
  } else {
    throw new Error(`Dictionary ${name}: Invalid configuration.`);
  }

  // Build full dictionary name
  const dictionaryName = config.database ? `${config.database}.${name}` : name;

  // Build CREATE SQL
  const fieldDefs = Object.entries(config.fields)
    .map(([fieldName, fieldType]) => `    ${fieldName} ${fieldType}`)
    .join(',\n');

  const pkList = primaryKeys.join(', ');

  const sourceConfig = buildDictionarySourceConfig(connection);

  const layoutFragment = layout === 'FLAT' ? 'FLAT()' : `${layout}()`;
  const lifetimeFragment = `MIN ${lifetime.min} MAX ${lifetime.max}`;

  const createSql = `
CREATE DICTIONARY IF NOT EXISTS ${dictionaryName} (
${fieldDefs}
)
PRIMARY KEY ${pkList}
SOURCE(CLICKHOUSE(
${sourceConfig}
    QUERY '${sourceQuery}'
))
LAYOUT(${layoutFragment})
LIFETIME(${lifetimeFragment});
`.trim();

  // Build DROP SQL
  const teardownSql = `DROP DICTIONARY IF EXISTS ${dictionaryName};`;

  return { createSql, teardownSql };
}

/**
 * Build ClickHouse connection configuration string
 */
function buildDictionarySourceConfig(connection: ClickHouseConnection): string {
  const parts: string[] = [];

  if (connection.host) {
    parts.push(`    HOST '${connection.host}'`);
  }
  if (connection.port) {
    parts.push(`    PORT ${connection.port}`);
  }
  if (connection.user) {
    parts.push(`    USER '${connection.user}'`);
  }
  if (connection.password) {
    parts.push(`    PASSWORD '${connection.password}'`);
  }
  if (connection.database) {
    parts.push(`    DB '${connection.database}'`);
  }

  return parts.join('\n');
}
