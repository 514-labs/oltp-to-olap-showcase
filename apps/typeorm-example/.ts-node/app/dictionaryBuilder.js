"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dictionary = Dictionary;
const moose_lib_1 = require("@514labs/moose-lib");
function Dictionary(name, config) {
    const { createSql, teardownSql } = generateDictionarySql(name, config);
    return new moose_lib_1.SqlResource(name, [createSql], [teardownSql]);
}
function generateDictionarySql(name, config) {
    if (!config.source && !config.query) {
        throw new Error(`Dictionary ${name}: Must specify either 'source' (table-based) or 'query' (custom SQL).`);
    }
    const defaultConnection = {
        host: 'localhost',
        port: 9000,
        user: 'panda',
        password: 'pandapass',
        database: 'local',
    };
    const connection = { ...defaultConnection, ...config.connection };
    const layout = config.layout || 'FLAT';
    const lifetime = { min: 300, max: 600, ...config.lifetime };
    let primaryKeys;
    if (config.primaryKey) {
        primaryKeys = Array.isArray(config.primaryKey) ? config.primaryKey : [config.primaryKey];
    }
    else if ('id' in config.fields) {
        primaryKeys = ['id'];
    }
    else {
        primaryKeys = [Object.keys(config.fields)[0]];
    }
    let sourceQuery;
    if (config.query) {
        sourceQuery = config.query;
    }
    else if (config.source) {
        const sourceDb = config.source.database || connection.database || 'local';
        const columns = config.source.columns || Object.keys(config.fields);
        const columnList = columns.join(', ');
        const whereClause = config.source.where ? ` WHERE ${config.source.where}` : '';
        sourceQuery = `SELECT ${columnList} FROM ${sourceDb}.${config.source.table}${whereClause}`;
    }
    else {
        throw new Error(`Dictionary ${name}: Invalid configuration.`);
    }
    const dictionaryName = config.database ? `${config.database}.${name}` : name;
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
    const teardownSql = `DROP DICTIONARY IF EXISTS ${dictionaryName};`;
    return { createSql, teardownSql };
}
function buildDictionarySourceConfig(connection) {
    const parts = [];
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
//# sourceMappingURL=dictionaryBuilder.js.map